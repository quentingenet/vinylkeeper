"""HTTP layer of the Atlas spot reports: who may call what, and what is validated."""
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.deps.deps import get_place_report_service, require_admin
from app.main import app
from app.schemas.place_report_schema import PlaceReportListResponse, PlaceReportResponse, ReportedPlace
from app.utils.auth_utils.auth import TokenType, create_token, get_current_user

SPOT = ReportedPlace(id=3, name="Shop", address="1 Street", city="Paris", country="France",
                     place_type_id=1, place_type="record_store", is_valid=True, is_moderated=True)
REPORT = PlaceReportResponse(id=9, place=SPOT, issues=["website"], status="open", reporter="jane",
                             created_at=datetime.now(timezone.utc))


@pytest.fixture
def service():
    return AsyncMock()


@pytest.fixture
async def member_client(mock_user, service):
    async def current_user():
        return mock_user

    app.dependency_overrides[get_current_user] = current_user
    app.dependency_overrides[get_place_report_service] = lambda: service
    with patch("app.core.lifespan.check_reference_data_exists", new_callable=AsyncMock, return_value=True):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            client.cookies.set("access_token", create_token(str(mock_user.user_uuid), TokenType.ACCESS))
            yield client
    app.dependency_overrides.clear()


@pytest.fixture
async def admin_client(member_client, mock_user):
    app.dependency_overrides[require_admin] = lambda: mock_user
    yield member_client


class TestMemberReports:
    async def test_a_member_reports_a_spot(self, member_client, service, mock_user):
        response = await member_client.post("/api/atlas/3/reports",
                                            json={"issues": ["website", "closed"], "comment": "Closed"})

        assert response.status_code == 201
        assert response.json() == {"message": "Thanks, an admin will check this spot."}
        user, place_id, data = service.report_place.await_args.args
        assert (user, place_id, data.issues, data.comment) == (mock_user, 3, ["website", "closed"], "Closed")

    @pytest.mark.parametrize("payload", [{"issues": []}, {"issues": ["price"]}, {"issues": ["name"], "x": 1},
                                         {"issues": ["name"], "comment": "x" * 501}])
    async def test_invalid_reports_are_refused(self, member_client, payload):
        assert (await member_client.post("/api/atlas/3/reports", json=payload)).status_code == 422

    async def test_visitors_cannot_report(self, client):
        assert (await client.post("/api/atlas/3/reports", json={"issues": ["name"]})).status_code == 401


class TestAdminOnly:
    @pytest.mark.parametrize("method, url", [
        ("get", "/api/vk-admin/place-reports"),
        ("post", "/api/vk-admin/place-reports/9/resolve"),
        ("post", "/api/vk-admin/place-reports/9/dismiss"),
        ("delete", "/api/vk-admin/places/3"),
    ])
    async def test_a_member_is_refused(self, member_client, service, method, url):
        response = await getattr(member_client, method)(url)

        assert response.status_code == 403
        assert not service.method_calls

    async def test_a_member_cannot_edit_a_spot(self, member_client):
        assert (await member_client.patch("/api/vk-admin/places/3", json={"name": "X"})).status_code == 403

    async def test_the_admin_lists_open_reports_by_default(self, admin_client, service):
        service.list_reports = AsyncMock(return_value=PlaceReportListResponse(
            items=[REPORT], total=1, page=1, limit=20, open_count=1))

        response = await admin_client.get("/api/vk-admin/place-reports")

        assert response.status_code == 200
        assert response.json()["items"][0]["place"]["name"] == "Shop"
        service.list_reports.assert_awaited_once_with("open", 1, 20)

    async def test_the_admin_lists_every_report(self, admin_client, service):
        service.list_reports = AsyncMock(return_value=PlaceReportListResponse(
            items=[], total=0, page=1, limit=20, open_count=0))

        await admin_client.get("/api/vk-admin/place-reports?status=all")

        service.list_reports.assert_awaited_once_with(None, 1, 20)

    async def test_the_admin_edits_a_spot(self, admin_client, service):
        service.update_place = AsyncMock(return_value=SPOT)

        response = await admin_client.patch("/api/vk-admin/places/3", json={"source_url": "https://new.example.com"})

        assert response.status_code == 200
        assert service.update_place.await_args.args[2].source_url == "https://new.example.com"

    async def test_the_admin_removes_a_spot(self, admin_client, service):
        assert (await admin_client.delete("/api/vk-admin/places/3")).status_code == 204
        service.remove_place.assert_awaited_once()
