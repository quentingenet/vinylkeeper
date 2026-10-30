"""
Real-database tests for the reports of wrong information on Atlas spots and the admin fixes.
Same safety model as test_real_db_relationships.py: everything runs in an outer transaction
that is rolled back. send_mail and geocode_city are patched (SMTP and a geocoding API).
"""
import uuid
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy import select

from app.core.exceptions import QuotaExceededError, ResourceNotFoundError, ValidationError
from app.models.place_model import Place
from app.models.place_report_model import PlaceReport
from app.repositories.atlas_repository import AtlasRepository
from app.repositories.place_report_repository import PlaceReportRepository
from app.schemas.place_report_schema import PlaceReportCreate
from app.schemas.place_schema import PlaceUpdate
from app.services import place_report_service as service_module
from app.services.place_report_service import PlaceReportService

from tests.integration.conftest import make_real_test_user as make_test_user
from tests.integration.test_atlas_moderation_integration import pick_existing_place_type_id


@pytest.fixture(autouse=True)
def mail():
    with patch.object(service_module, "send_mail", new_callable=AsyncMock, return_value=True) as send:
        yield send


def make_service(session) -> PlaceReportService:
    return PlaceReportService(PlaceReportRepository(session), AtlasRepository(session))


async def make_spot(session, moderated: bool = True, **values) -> Place:
    place = Place(name=f"itest spot {uuid.uuid4().hex[:8]}", address="1 Test Street", city="Paris",
                  country="France", latitude=48.8566, longitude=2.3522,
                  place_type_id=await pick_existing_place_type_id(session), is_moderated=moderated, **values)
    session.add(place)
    await session.flush()
    return place


class TestReportSpot:
    async def test_a_member_reports_and_the_admins_get_an_email(self, real_session, mail):
        user = await make_test_user(real_session)
        spot = await make_spot(real_session)

        await make_service(real_session).report_place(
            user, spot.id, PlaceReportCreate(issues=["website", "closed"], comment="  Shop closed in 2025  "))

        report = (await real_session.execute(
            select(PlaceReport).where(PlaceReport.place_id == spot.id))).scalar_one()
        assert (report.issues, report.comment, report.status, report.user_id) == (
            ["website", "closed"], "Shop closed in 2025", "open", user.id)
        assert mail.await_args.kwargs["issues"] == ["website", "closed"]
        assert mail.await_args.kwargs["place_name"] == spot.name

    async def test_reporting_the_same_spot_again_waits_for_the_admin(self, real_session):
        user = await make_test_user(real_session)
        spot = await make_spot(real_session)
        service = make_service(real_session)
        await service.report_place(user, spot.id, PlaceReportCreate(issues=["name"]))

        with pytest.raises(ValidationError, match="already reported"):
            await service.report_place(user, spot.id, PlaceReportCreate(issues=["address"]))

    async def test_a_spot_not_on_the_map_cannot_be_reported(self, real_session):
        user = await make_test_user(real_session)
        pending = await make_spot(real_session, moderated=False)

        with pytest.raises(ResourceNotFoundError):
            await make_service(real_session).report_place(user, pending.id, PlaceReportCreate(issues=["name"]))

    async def test_ten_reports_a_day_at_most(self, real_session, monkeypatch):
        monkeypatch.setattr(service_module, "MAX_REPORTS_PER_DAY", 2)
        user = await make_test_user(real_session)
        service = make_service(real_session)
        for _ in range(2):
            await service.report_place(user, (await make_spot(real_session)).id, PlaceReportCreate(issues=["name"]))

        with pytest.raises(QuotaExceededError):
            await service.report_place(user, (await make_spot(real_session)).id, PlaceReportCreate(issues=["name"]))

    async def test_unknown_issues_are_refused_by_the_database_too(self, real_session):
        spot = await make_spot(real_session)

        with pytest.raises(Exception):
            async with real_session.begin_nested():
                real_session.add(PlaceReport(place_id=spot.id, issues=["price"]))
                await real_session.flush()


class TestAdminHandlesReports:
    async def test_resolving_closes_every_open_report_of_the_spot(self, real_session):
        admin, first, second = (await make_test_user(real_session), await make_test_user(real_session),
                                await make_test_user(real_session))
        spot = await make_spot(real_session)
        service = make_service(real_session)
        await service.report_place(first, spot.id, PlaceReportCreate(issues=["name"]))
        await service.report_place(second, spot.id, PlaceReportCreate(issues=["address"]))
        listed = await service.list_reports("open", 1, 50)
        mine = [r for r in listed.items if r.place.id == spot.id]

        resolved = await service.resolve(mine[0].id, admin)

        assert len(mine) == 2 and listed.open_count >= 2
        assert resolved.status == "resolved" and resolved.resolved_at is not None
        assert {r.status for r in (await service.list_reports(None, 1, 500)).items if r.place.id == spot.id} == {
            "resolved"}

    async def test_dismissing_closes_only_that_report(self, real_session):
        admin, first, second = (await make_test_user(real_session), await make_test_user(real_session),
                                await make_test_user(real_session))
        spot = await make_spot(real_session)
        service = make_service(real_session)
        await service.report_place(first, spot.id, PlaceReportCreate(issues=["name"]))
        await service.report_place(second, spot.id, PlaceReportCreate(issues=["name"]))
        ids = [r.id for r in (await service.list_reports("open", 1, 500)).items if r.place.id == spot.id]

        dismissed = await service.dismiss(ids[0], admin)

        assert dismissed.status == "dismissed"
        assert (await service.repository.get(ids[1])).status == "open"
        with pytest.raises(ValidationError, match="already dismissed"):
            await service.dismiss(ids[0], admin)

    async def test_a_report_shows_what_to_correct(self, real_session):
        user = await make_test_user(real_session)
        spot = await make_spot(real_session, description="Old text", source_url="https://old.example.com")
        service = make_service(real_session)
        await service.report_place(user, spot.id, PlaceReportCreate(issues=["description"], comment="New owner"))

        [report] = [r for r in (await service.list_reports("open", 1, 500)).items if r.place.id == spot.id]

        assert (report.reporter, report.comment, report.issues) == (user.username, "New owner", ["description"])
        assert (report.place.description, report.place.source_url) == ("Old text", "https://old.example.com")
        assert report.place.place_type is not None


class TestAdminFixesSpot:
    async def test_the_correction_is_published_without_moderation(self, real_session):
        admin = await make_test_user(real_session)
        spot = await make_spot(real_session)

        fixed = await make_service(real_session).update_place(
            admin, spot.id, PlaceUpdate(name="Right Name", source_url="https://right.example.com"))

        assert (fixed.name, fixed.source_url, fixed.is_moderated) == ("Right Name", "https://right.example.com", True)

    async def test_a_new_city_moves_the_pin(self, real_session):
        admin = await make_test_user(real_session)
        spot = await make_spot(real_session)
        with patch.object(service_module, "geocode_city", new=AsyncMock(return_value=(45.76, 4.83))) as geocode:
            await make_service(real_session).update_place(admin, spot.id, PlaceUpdate(city="Lyon"))

        geocode.assert_awaited_once_with("Lyon", "France")
        moved = (await real_session.execute(select(Place).where(Place.id == spot.id))).scalar_one()
        assert (moved.city, moved.latitude, moved.longitude) == ("Lyon", 45.76, 4.83)

    async def test_a_city_that_cannot_be_found_changes_nothing(self, real_session):
        admin = await make_test_user(real_session)
        spot = await make_spot(real_session)
        with patch.object(service_module, "geocode_city", new=AsyncMock(return_value=None)):
            with pytest.raises(ValidationError, match="Could not find"):
                await make_service(real_session).update_place(admin, spot.id, PlaceUpdate(city="Nowhere"))

    async def test_removing_a_closed_spot_resolves_its_reports(self, real_session):
        admin, user = await make_test_user(real_session), await make_test_user(real_session)
        spot = await make_spot(real_session)
        service = make_service(real_session)
        await service.report_place(user, spot.id, PlaceReportCreate(issues=["closed"]))

        await service.remove_place(admin, spot.id)

        is_valid = (await real_session.execute(select(Place.is_valid).where(Place.id == spot.id))).scalar_one()
        status = (await real_session.execute(
            select(PlaceReport.status).where(PlaceReport.place_id == spot.id))).scalar_one()
        assert is_valid is False and status == "resolved"
