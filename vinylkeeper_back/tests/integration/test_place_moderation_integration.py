"""
Real-database integration tests for the Places & Moderation domain.

Same safety model as test_real_db_relationships.py: real_session runs every
test inside an outer transaction + SAVEPOINT that is rolled back at the end.

geocode_city and send_mail are patched: they hit real external services
(a geocoding API, an SMTP server) and have no place in a DB-focused
integration test. Valid coordinates are supplied directly so geocode_city
would not be called anyway in most tests; it is still patched defensively.
"""
import uuid
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.reference_data.place_types import PlaceType
from app.models.place_model import Place

from app.repositories.place_repository import PlaceRepository
from app.repositories.moderation_request_repository import ModerationRequestRepository

from app.services.place_service import PlaceService
from app.services.moderation_service import ModerationService

from app.schemas.place_schema import PlaceCreate, PlaceUpdate
from app.core.exceptions import ForbiddenError
from app.core.enums import ModerationStatusEnum

from tests.integration.conftest import make_real_test_user as make_test_user


def make_place_service(session: AsyncSession) -> PlaceService:
    return PlaceService(
        repository=PlaceRepository(session),
        moderation_request_repository=ModerationRequestRepository(session),
    )


def make_moderation_service(session: AsyncSession) -> ModerationService:
    return ModerationService(
        moderation_repository=ModerationRequestRepository(session),
        place_repository=PlaceRepository(session),
    )


async def pick_existing_place_type_id(session: AsyncSession) -> int:
    return (await session.execute(select(PlaceType.id).limit(1))).scalar_one()


def make_place_create(place_type_id: int) -> PlaceCreate:
    return PlaceCreate(
        name=f"Integration Test Shop {uuid.uuid4().hex[:8]}",
        address="1 Test Street",
        city="Paris",
        country="France",
        place_type_id=place_type_id,
        latitude=48.8566,
        longitude=2.3522,
        description="Created by an integration test",
    )


@pytest.fixture(autouse=True)
def _no_real_mail():
    with patch("app.services.place_service.send_mail", new_callable=AsyncMock, return_value=True):
        yield


class TestCreatePlace:
    async def test_creates_place_and_pending_moderation_request(self, real_session):
        user = await make_test_user(real_session)
        place_type_id = await pick_existing_place_type_id(real_session)
        service = make_place_service(real_session)

        response = await service.create_place(make_place_create(place_type_id), user)

        assert response.id > 0

        pending_status_id = (
            await ModerationRequestRepository(real_session).get_moderation_status_by_name(
                ModerationStatusEnum.PENDING.value
            )
        ).id

        from app.models.moderation_request_model import ModerationRequest
        mod_request = (
            await real_session.execute(
                select(ModerationRequest).filter(ModerationRequest.place_id == response.id)
            )
        ).scalar_one()
        assert mod_request.status_id == pending_status_id
        assert mod_request.user_id == user.id


class TestUpdatePlace:
    async def test_owner_can_update(self, real_session):
        user = await make_test_user(real_session)
        place_type_id = await pick_existing_place_type_id(real_session)
        service = make_place_service(real_session)
        created = await service.create_place(make_place_create(place_type_id), user)

        updated = await service.update_place(
            user, created.id, PlaceUpdate(name="Renamed Shop")
        )

        assert updated.name == "Renamed Shop"

    async def test_non_owner_cannot_update(self, real_session):
        owner = await make_test_user(real_session)
        intruder = await make_test_user(real_session)
        place_type_id = await pick_existing_place_type_id(real_session)
        service = make_place_service(real_session)
        created = await service.create_place(make_place_create(place_type_id), owner)

        with pytest.raises(ForbiddenError):
            await service.update_place(intruder, created.id, PlaceUpdate(name="Hijacked"))

    async def test_editing_an_approved_place_hides_it_until_approved_again(self, real_session):
        from app.models.moderation_request_model import ModerationRequest
        user = await make_test_user(real_session)
        place_type_id = await pick_existing_place_type_id(real_session)
        service = make_place_service(real_session)
        created = await service.create_place(make_place_create(place_type_id), user)
        first_request = (
            await real_session.execute(
                select(ModerationRequest).filter(ModerationRequest.place_id == created.id)
            )
        ).scalar_one()
        await make_moderation_service(real_session).approve_moderation_request(
            first_request.id, admin_user_id=user.id
        )

        await service.update_place(user, created.id, PlaceUpdate(description="Changed after approval"))

        map_ids = {place.id for place in await service.get_map_places()}
        assert created.id not in map_ids
        requests = (
            await real_session.execute(
                select(ModerationRequest).filter(ModerationRequest.place_id == created.id)
            )
        ).scalars().all()
        assert len(requests) == 2


class TestDeletePlace:
    async def test_owner_can_soft_delete(self, real_session):
        user = await make_test_user(real_session)
        place_type_id = await pick_existing_place_type_id(real_session)
        service = make_place_service(real_session)
        created = await service.create_place(make_place_create(place_type_id), user)

        result = await service.delete_place(user, created.id)
        assert result is True

        place = (
            await real_session.execute(select(Place).filter(Place.id == created.id))
        ).scalar_one()
        assert place.is_valid is False


class TestModerationApproveRejectFlow:
    async def test_approve_marks_place_moderated(self, real_session):
        user = await make_test_user(real_session)
        place_type_id = await pick_existing_place_type_id(real_session)
        place_service = make_place_service(real_session)
        moderation_service = make_moderation_service(real_session)

        created = await place_service.create_place(make_place_create(place_type_id), user)

        from app.models.moderation_request_model import ModerationRequest
        mod_request = (
            await real_session.execute(
                select(ModerationRequest).filter(ModerationRequest.place_id == created.id)
            )
        ).scalar_one()

        approved = await moderation_service.approve_moderation_request(
            mod_request.id, admin_user_id=user.id
        )
        assert approved.status.name == ModerationStatusEnum.APPROVED.value

        place = (
            await real_session.execute(select(Place).filter(Place.id == created.id))
        ).scalar_one()
        assert place.is_moderated is True
        assert place.is_valid is True

    async def test_reject_invalidates_place(self, real_session):
        user = await make_test_user(real_session)
        place_type_id = await pick_existing_place_type_id(real_session)
        place_service = make_place_service(real_session)
        moderation_service = make_moderation_service(real_session)

        created = await place_service.create_place(make_place_create(place_type_id), user)

        from app.models.moderation_request_model import ModerationRequest
        mod_request = (
            await real_session.execute(
                select(ModerationRequest).filter(ModerationRequest.place_id == created.id)
            )
        ).scalar_one()

        rejected = await moderation_service.reject_moderation_request(
            mod_request.id, admin_user_id=user.id
        )
        assert rejected.status.name == ModerationStatusEnum.REJECTED.value

        place = (
            await real_session.execute(select(Place).filter(Place.id == created.id))
        ).scalar_one()
        assert place.is_moderated is False
        assert place.is_valid is False


class TestLikeUnlikePlace:
    async def test_like_then_unlike_moderated_place(self, real_session):
        user = await make_test_user(real_session)
        place_type_id = await pick_existing_place_type_id(real_session)
        place_service = make_place_service(real_session)
        moderation_service = make_moderation_service(real_session)

        created = await place_service.create_place(make_place_create(place_type_id), user)

        from app.models.moderation_request_model import ModerationRequest
        mod_request = (
            await real_session.execute(
                select(ModerationRequest).filter(ModerationRequest.place_id == created.id)
            )
        ).scalar_one()
        await moderation_service.approve_moderation_request(mod_request.id, admin_user_id=user.id)

        like_result = await place_service.like_place(user, created.id)
        assert like_result["is_liked"] is True
        assert like_result["likes_count"] == 1

        unlike_result = await place_service.unlike_place(user, created.id)
        assert unlike_result["is_liked"] is False
        assert unlike_result["likes_count"] == 0
