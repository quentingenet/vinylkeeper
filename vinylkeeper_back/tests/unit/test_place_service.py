import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.place_service import PlaceService
from app.schemas.place_schema import PlaceCreate, PlaceUpdate, PaginatedPlaceResponse
from app.core.exceptions import ForbiddenError, ServerError, ValidationError

from tests.conftest import make_user


def make_db():
    db = AsyncMock()
    db.flush = AsyncMock()
    db.commit = AsyncMock()
    db.rollback = AsyncMock()
    return db


def make_place(place_id: int = 1, submitted_by_id: int = 1, name: str = "Vinyl Shop") -> MagicMock:
    place = MagicMock()
    place.id = place_id
    place.submitted_by_id = submitted_by_id
    place.name = name
    place.address = "1 rue de la Paix"
    place.city = "Paris"
    place.country = "France"
    place.description = None
    place.source_url = None
    place.latitude = 48.8566
    place.longitude = 2.3522
    place.place_type_id = 1
    place.is_moderated = True
    place.is_valid = True
    place.created_at = datetime.now(timezone.utc)
    place.updated_at = datetime.now(timezone.utc)

    place.submitted_by = MagicMock()
    place.submitted_by.username = "alice"
    place.submitted_by.user_uuid = "123e4567-e89b-12d3-a456-426614174000"

    place.place_type = MagicMock()
    place.place_type.name = "record_store"
    return place


def make_place_data(**overrides) -> PlaceCreate:
    """Create a payload that can be intentionally invalid for service tests."""
    defaults = dict(
        name="Vinyl Shop",
        address="1 rue de la Paix",
        city="Paris",
        country="France",
        place_type_id=1,
        latitude=48.8566,
        longitude=2.3522,
        description=None,
        source_url=None,
        submitted_by_id=None,
    )
    return PlaceCreate.model_construct(**{**defaults, **overrides})


def make_pending_status(status_id: int = 1) -> MagicMock:
    status = MagicMock()
    status.id = status_id
    return status


def make_service():
    repo = AsyncMock()
    repo.db = make_db()
    mod_repo = AsyncMock()
    service = PlaceService(repo, mod_repo)
    return service, repo, mod_repo

# ---------------------------------------------------------------------------
# _validate_place_data
# ---------------------------------------------------------------------------


class TestValidatePlaceData:
    def test_empty_name_raises(self):
        service, *_ = make_service()
        with pytest.raises(ValidationError, match="Place name is required"):
            service._validate_place_data(make_place_data(name=""))

    def test_whitespace_name_raises(self):
        service, *_ = make_service()
        with pytest.raises(ValidationError, match="Place name is required"):
            service._validate_place_data(make_place_data(name="   "))

    def test_empty_city_raises(self):
        service, *_ = make_service()
        with pytest.raises(ValidationError, match="City is required"):
            service._validate_place_data(make_place_data(city=""))

    def test_empty_country_raises(self):
        service, *_ = make_service()
        with pytest.raises(ValidationError, match="Country is required"):
            service._validate_place_data(make_place_data(country=""))

    def test_empty_address_raises(self):
        service, *_ = make_service()
        with pytest.raises(ValidationError, match="Address is required"):
            service._validate_place_data(make_place_data(address="   "))

    def test_partial_coordinates_raises(self):
        service, *_ = make_service()
        with pytest.raises(ValidationError, match="Both latitude and longitude are required"):
            service._validate_place_data(make_place_data(latitude=48.8566, longitude=None))

    def test_valid_data_does_not_raise(self):
        service, *_ = make_service()
        service._validate_place_data(make_place_data())


class TestCreatePlace:
    async def test_unknown_place_type_raises(self):
        service, repo, *_ = make_service()
        repo.get_place_type_by_id = AsyncMock(return_value=None)
        user = make_user()

        with pytest.raises(ValidationError, match="not found"):
            await service.create_place(make_place_data(), user)

    async def test_valid_coordinates_skip_geocoding(self):
        service, repo, mod_repo = make_service()
        place_type = MagicMock(id=1)
        repo.get_place_type_by_id = AsyncMock(return_value=place_type)
        created = make_place()
        repo.create_place = AsyncMock(return_value=created)
        repo.get_place_likes_count = AsyncMock(return_value=0)
        repo.get_moderation_status_by_name = AsyncMock(return_value=make_pending_status())
        mod_repo.create_request = AsyncMock(return_value=MagicMock())
        user = make_user()

        with patch("app.services.place_service.geocode_city") as mock_geocode, \
                patch("app.services.place_service.send_mail", new_callable=AsyncMock, return_value=True), \
                patch.object(service, "_create_place_response", return_value=MagicMock()):
            await service.create_place(make_place_data(latitude=48.8566, longitude=2.3522), user)

        mock_geocode.assert_not_called()

    async def test_missing_coordinates_trigger_geocoding(self):
        service, repo, mod_repo = make_service()
        place_type = MagicMock(id=1)
        repo.get_place_type_by_id = AsyncMock(return_value=place_type)
        created = make_place()
        repo.create_place = AsyncMock(return_value=created)
        repo.get_place_likes_count = AsyncMock(return_value=0)
        repo.get_moderation_status_by_name = AsyncMock(return_value=make_pending_status())
        mod_repo.create_request = AsyncMock(return_value=MagicMock())
        user = make_user()

        geocode_patch = patch(
            "app.services.place_service.geocode_city",
            new_callable=AsyncMock, return_value=(48.8566, 2.3522)
        )
        send_mail_patch = patch("app.services.place_service.send_mail", new_callable=AsyncMock, return_value=True)
        resp_patch = patch.object(service, "_create_place_response", return_value=MagicMock())
        with geocode_patch as mock_geocode, send_mail_patch, resp_patch:
            await service.create_place(make_place_data(latitude=None, longitude=None), user)

        mock_geocode.assert_awaited_once()

    async def test_geocoding_failure_raises(self):
        service, repo, *_ = make_service()
        place_type = MagicMock(id=1)
        repo.get_place_type_by_id = AsyncMock(return_value=place_type)
        user = make_user()

        with patch("app.services.place_service.geocode_city", new_callable=AsyncMock, return_value=None):
            with pytest.raises(ValidationError, match="Could not find coordinates"):
                await service.create_place(make_place_data(latitude=None, longitude=None), user)

    async def test_success_creates_moderation_request(self):
        service, repo, mod_repo = make_service()
        place_type = MagicMock(id=1)
        repo.get_place_type_by_id = AsyncMock(return_value=place_type)
        created = make_place()
        repo.create_place = AsyncMock(return_value=created)
        repo.get_place_likes_count = AsyncMock(return_value=0)
        repo.get_moderation_status_by_name = AsyncMock(return_value=make_pending_status())
        mod_repo.create_request = AsyncMock(return_value=MagicMock())
        user = make_user()

        with patch("app.services.place_service.send_mail", new_callable=AsyncMock, return_value=True), \
                patch.object(service, "_create_place_response", return_value=MagicMock()):
            await service.create_place(make_place_data(), user)

        mod_repo.create_request.assert_awaited_once()

    async def test_smtp_failure_does_not_raise(self):
        service, repo, mod_repo = make_service()
        place_type = MagicMock(id=1)
        repo.get_place_type_by_id = AsyncMock(return_value=place_type)
        created = make_place()
        repo.create_place = AsyncMock(return_value=created)
        repo.get_place_likes_count = AsyncMock(return_value=0)
        repo.get_moderation_status_by_name = AsyncMock(return_value=make_pending_status())
        mod_repo.create_request = AsyncMock(return_value=MagicMock())
        user = make_user()

        send_mail_patch = patch(
            "app.services.place_service.send_mail",
            new_callable=AsyncMock, side_effect=Exception("SMTP down")
        )
        with send_mail_patch, patch.object(service, "_create_place_response", return_value=MagicMock()):
            await service.create_place(make_place_data(), user)


class TestUpdatePlace:
    async def test_not_owner_raises(self):
        service, repo, *_ = make_service()
        repo.get_place_by_id = AsyncMock(return_value=make_place(submitted_by_id=2))
        user = make_user(user_id=1)

        with pytest.raises(ForbiddenError):
            await service.update_place(user, place_id=1, place_data=PlaceUpdate(name="New name"))

    async def test_success(self):
        service, repo, *_ = make_service()
        place = make_place(submitted_by_id=1)
        repo.get_place_by_id = AsyncMock(return_value=place)
        updated = make_place(submitted_by_id=1, name="Updated")
        repo.update_place = AsyncMock(return_value=updated)
        repo.get_place_likes_count = AsyncMock(return_value=3)
        repo.is_place_liked_by_user = AsyncMock(return_value=False)
        user = make_user(user_id=1)

        with patch.object(service, "_create_place_response", return_value=MagicMock()) as mock_resp:
            await service.update_place(user, place_id=1, place_data=PlaceUpdate(name="Updated"))

        mock_resp.assert_called_once()


class TestDeletePlace:
    async def test_not_owner_raises(self):
        service, repo, *_ = make_service()
        repo.get_place_by_id = AsyncMock(return_value=make_place(submitted_by_id=2))
        user = make_user(user_id=1)

        with pytest.raises(ForbiddenError):
            await service.delete_place(user, place_id=1)

    async def test_success_returns_true(self):
        service, repo, *_ = make_service()
        repo.get_place_by_id = AsyncMock(return_value=make_place(submitted_by_id=1))
        repo.delete_place = AsyncMock(return_value=True)
        user = make_user(user_id=1)

        result = await service.delete_place(user, place_id=1)
        assert result is True
        repo.delete_place.assert_awaited_once_with(1)


class TestGetPlaceAdmin:
    async def test_uses_internal_lookup_to_include_non_moderated_places(self):
        service, repo, *_ = make_service()
        place = make_place(place_id=7)
        repo.get_place_by_id_internal = AsyncMock(return_value=place)
        repo.get_place_likes_count = AsyncMock(return_value=4)
        repo.is_place_liked_by_user = AsyncMock(return_value=False)

        result = await service.get_place_admin(place_id=7)

        repo.get_place_by_id_internal.assert_awaited_once_with(7)
        assert result is not None


class TestLikePlace:
    async def test_already_liked_is_idempotent(self):
        """Liker une place déjà likée retourne l'état courant sans erreur."""
        service, repo, *_ = make_service()
        repo.get_moderated_place_by_id = AsyncMock(return_value=make_place())
        repo.is_place_liked_by_user = AsyncMock(return_value=True)
        repo.get_place_likes_count = AsyncMock(return_value=5)
        user = make_user(user_id=1)

        result = await service.like_place(user, place_id=1)

        assert result["is_liked"] is True
        assert result["likes_count"] == 5
        repo.like_place.assert_not_awaited()

    async def test_integrity_error_race_condition_is_idempotent(self):
        """IntegrityError DB (race condition) est géré comme un succès idempotent."""
        from sqlalchemy.exc import IntegrityError
        service, repo, *_ = make_service()
        repo.get_moderated_place_by_id = AsyncMock(return_value=make_place())
        repo.is_place_liked_by_user = AsyncMock(return_value=False)
        repo.like_place = AsyncMock(side_effect=IntegrityError("", None, None))
        repo.get_place_likes_count = AsyncMock(return_value=5)
        user = make_user(user_id=1)

        result = await service.like_place(user, place_id=1)

        assert result["is_liked"] is True
        assert result["likes_count"] == 5

    async def test_success_returns_dict(self):
        service, repo, *_ = make_service()
        repo.get_moderated_place_by_id = AsyncMock(return_value=make_place())
        repo.is_place_liked_by_user = AsyncMock(return_value=False)
        repo.like_place = AsyncMock()
        repo.get_place_likes_count = AsyncMock(return_value=7)
        user = make_user(user_id=1)

        result = await service.like_place(user, place_id=1)

        assert result["is_liked"] is True
        assert result["likes_count"] == 7


class TestUnlikePlace:
    async def test_not_liked_is_idempotent(self):
        """Unliker une place non likée retourne l'état courant sans erreur."""
        service, repo, *_ = make_service()
        repo.get_moderated_place_by_id = AsyncMock(return_value=make_place())
        repo.is_place_liked_by_user = AsyncMock(return_value=False)
        repo.get_place_likes_count = AsyncMock(return_value=2)
        user = make_user(user_id=1)

        result = await service.unlike_place(user, place_id=1)

        assert result["is_liked"] is False
        assert result["likes_count"] == 2
        repo.unlike_place.assert_not_awaited()

    async def test_success_returns_dict(self):
        service, repo, *_ = make_service()
        repo.get_moderated_place_by_id = AsyncMock(return_value=make_place())
        repo.is_place_liked_by_user = AsyncMock(return_value=True)
        repo.unlike_place = AsyncMock()
        repo.get_place_likes_count = AsyncMock(return_value=2)
        user = make_user(user_id=1)

        result = await service.unlike_place(user, place_id=1)

        assert result["is_liked"] is False
        assert result["likes_count"] == 2


class TestCreateModerationRequest:
    async def test_pending_status_not_found_raises(self):
        service, repo, *_ = make_service()
        repo.get_moderation_status_by_name = AsyncMock(return_value=None)

        with pytest.raises(ServerError, match="Pending moderation status not found"):
            await service._create_moderation_request(place_id=1, user_id=1)

    async def test_success_creates_request(self):
        service, repo, mod_repo = make_service()
        repo.get_moderation_status_by_name = AsyncMock(return_value=make_pending_status(status_id=1))
        mod_repo.create_request = AsyncMock(return_value=MagicMock())

        await service._create_moderation_request(place_id=5, user_id=2)

        call_kwargs = mod_repo.create_request.call_args[0][0]
        assert call_kwargs["place_id"] == 5
        assert call_kwargs["user_id"] == 2
        assert call_kwargs["status_id"] == 1


class TestGetAllPlaces:
    async def test_returns_paginated_response(self):
        service, repo, *_ = make_service()
        repo.count_all_moderated_places = AsyncMock(return_value=2)
        repo.get_all_moderated_places = AsyncMock(return_value=[])
        user = make_user()

        with patch.object(service, "_build_public_place_responses", new_callable=AsyncMock, return_value=[]):
            result = await service.get_all_places(user, page=1, limit=20)

        assert isinstance(result, PaginatedPlaceResponse)
        assert result.total == 2
        assert result.page == 1
        assert result.limit == 20
        assert result.total_pages == 1

    async def test_offset_calculated_from_page(self):
        service, repo, *_ = make_service()
        repo.count_all_moderated_places = AsyncMock(return_value=100)
        repo.get_all_moderated_places = AsyncMock(return_value=[])
        user = make_user()

        with patch.object(service, "_build_public_place_responses", new_callable=AsyncMock, return_value=[]):
            await service.get_all_places(user, page=3, limit=10)

        repo.get_all_moderated_places.assert_awaited_once_with(10, 20)

    async def test_total_pages_ceiling_division(self):
        service, repo, *_ = make_service()
        repo.count_all_moderated_places = AsyncMock(return_value=21)
        repo.get_all_moderated_places = AsyncMock(return_value=[])
        user = make_user()

        with patch.object(service, "_build_public_place_responses", new_callable=AsyncMock, return_value=[]):
            result = await service.get_all_places(user, page=1, limit=20)

        assert result.total_pages == 2

    async def test_empty_result_returns_page_one(self):
        service, repo, *_ = make_service()
        repo.count_all_moderated_places = AsyncMock(return_value=0)
        repo.get_all_moderated_places = AsyncMock(return_value=[])
        user = make_user()

        with patch.object(service, "_build_public_place_responses", new_callable=AsyncMock, return_value=[]):
            result = await service.get_all_places(user, page=1, limit=20)

        assert result.total == 0
        assert result.total_pages == 1
        assert result.items == []


class TestSearchPlaces:
    async def test_returns_paginated_response(self):
        service, repo, *_ = make_service()
        repo.count_moderated_places_by_search = AsyncMock(return_value=3)
        repo.search_moderated_places = AsyncMock(return_value=[])
        user = make_user()

        with patch.object(service, "_build_public_place_responses", new_callable=AsyncMock, return_value=[]):
            result = await service.search_places("vinyl", user, page=1, limit=20)

        assert isinstance(result, PaginatedPlaceResponse)
        assert result.total == 3
        assert result.page == 1

    async def test_offset_calculated_from_page(self):
        service, repo, *_ = make_service()
        repo.count_moderated_places_by_search = AsyncMock(return_value=50)
        repo.search_moderated_places = AsyncMock(return_value=[])
        user = make_user()

        with patch.object(service, "_build_public_place_responses", new_callable=AsyncMock, return_value=[]):
            await service.search_places("vinyl", user, page=2, limit=10)

        repo.search_moderated_places.assert_awaited_once_with("vinyl", 10, 10)

    async def test_total_pages_ceiling_division(self):
        service, repo, *_ = make_service()
        repo.count_moderated_places_by_search = AsyncMock(return_value=11)
        repo.search_moderated_places = AsyncMock(return_value=[])
        user = make_user()

        with patch.object(service, "_build_public_place_responses", new_callable=AsyncMock, return_value=[]):
            result = await service.search_places("vinyl", user, page=1, limit=10)

        assert result.total_pages == 2


class TestGetPlacesByType:
    async def test_returns_paginated_response(self):
        service, repo, *_ = make_service()
        repo.count_moderated_places_by_type = AsyncMock(return_value=5)
        repo.get_moderated_places_by_type = AsyncMock(return_value=[])
        user = make_user()

        with patch.object(service, "_build_public_place_responses", new_callable=AsyncMock, return_value=[]):
            result = await service.get_places_by_type(1, user, page=1, limit=20)

        assert isinstance(result, PaginatedPlaceResponse)
        assert result.total == 5

    async def test_offset_calculated_from_page(self):
        service, repo, *_ = make_service()
        repo.count_moderated_places_by_type = AsyncMock(return_value=30)
        repo.get_moderated_places_by_type = AsyncMock(return_value=[])
        user = make_user()

        with patch.object(service, "_build_public_place_responses", new_callable=AsyncMock, return_value=[]):
            await service.get_places_by_type(2, user, page=4, limit=5)

        repo.get_moderated_places_by_type.assert_awaited_once_with(2, 5, 15)

    async def test_total_pages_exact_division(self):
        service, repo, *_ = make_service()
        repo.count_moderated_places_by_type = AsyncMock(return_value=20)
        repo.get_moderated_places_by_type = AsyncMock(return_value=[])
        user = make_user()

        with patch.object(service, "_build_public_place_responses", new_callable=AsyncMock, return_value=[]):
            result = await service.get_places_by_type(1, user, page=1, limit=20)

        assert result.total_pages == 1


class TestGetPlacesInRegion:
    async def test_returns_paginated_response(self):
        service, repo, *_ = make_service()
        repo.count_moderated_places_in_region = AsyncMock(return_value=4)
        repo.get_moderated_places_in_region = AsyncMock(return_value=[])
        user = make_user()

        with patch.object(service, "_build_public_place_responses", new_callable=AsyncMock, return_value=[]):
            result = await service.get_places_in_region(40.0, 50.0, 0.0, 10.0, user, page=1, limit=20)

        assert isinstance(result, PaginatedPlaceResponse)
        assert result.total == 4
        assert result.page == 1

    async def test_offset_calculated_from_page(self):
        service, repo, *_ = make_service()
        repo.count_moderated_places_in_region = AsyncMock(return_value=40)
        repo.get_moderated_places_in_region = AsyncMock(return_value=[])
        user = make_user()

        with patch.object(service, "_build_public_place_responses", new_callable=AsyncMock, return_value=[]):
            await service.get_places_in_region(40.0, 50.0, 0.0, 10.0, user, page=2, limit=20)

        repo.get_moderated_places_in_region.assert_awaited_once_with(40.0, 50.0, 0.0, 10.0, 20, 20)

    async def test_total_pages_ceiling_division(self):
        service, repo, *_ = make_service()
        repo.count_moderated_places_in_region = AsyncMock(return_value=41)
        repo.get_moderated_places_in_region = AsyncMock(return_value=[])
        user = make_user()

        with patch.object(service, "_build_public_place_responses", new_callable=AsyncMock, return_value=[]):
            result = await service.get_places_in_region(40.0, 50.0, 0.0, 10.0, user, page=1, limit=20)

        assert result.total_pages == 3
