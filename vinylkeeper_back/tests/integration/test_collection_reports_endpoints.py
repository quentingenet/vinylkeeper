"""HTTP layer of the public collection reports: who may call what, and what is validated."""
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.deps.deps import get_collection_report_service, require_admin
from app.main import app
from app.schemas.collection_report_schema import (
    CollectionReportListResponse,
    CollectionReportResponse,
    ReportedCollection,
)
from app.utils.auth_utils.auth import create_access_token, get_current_user

COLLECTION = ReportedCollection(id=4, name="My crates", is_public=True, owner="bob")
REPORT = CollectionReportResponse(id=7, collection=COLLECTION, reason="offensive", status="open", reporter="jane",
                                  created_at=datetime.now(timezone.utc))


@pytest.fixture
def service():
    return AsyncMock()


@pytest.fixture
async def member_client(mock_user, service):
    async def current_user():
        return mock_user

    app.dependency_overrides[get_current_user] = current_user
    app.dependency_overrides[get_collection_report_service] = lambda: service
    with patch("app.core.lifespan.check_reference_data_exists", new_callable=AsyncMock, return_value=True):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            client.cookies.set("access_token", create_access_token(str(mock_user.user_uuid)))
            yield client
    app.dependency_overrides.clear()


@pytest.fixture
async def admin_client(member_client, mock_user):
    app.dependency_overrides[require_admin] = lambda: mock_user
    yield member_client


class TestMemberReports:
    async def test_a_member_reports_a_public_collection(self, member_client, service, mock_user):
        response = await member_client.post("/api/collections/4/reports",
                                            json={"reason": "spam", "comment": "  Ads everywhere  "})

        assert response.status_code == 201
        assert response.json() == {"message": "Thanks, an admin will check this collection."}
        user, collection_id, data, _background_tasks = service.report_collection.await_args.args
        assert (user, collection_id, data.reason, data.comment) == (mock_user, 4, "spam", "Ads everywhere")

    @pytest.mark.parametrize("payload", [{}, {"reason": "ugly"}, {"reason": "spam", "x": 1},
                                         {"reason": "other", "comment": "x" * 501}])
    async def test_invalid_reports_are_refused(self, member_client, payload):
        assert (await member_client.post("/api/collections/4/reports", json=payload)).status_code == 422

    async def test_visitors_cannot_report(self, client):
        assert (await client.post("/api/collections/4/reports", json={"reason": "spam"})).status_code == 401


class TestAdmin:
    @pytest.mark.parametrize("method, url", [
        ("get", "/api/vk-admin/collection-reports"),
        ("post", "/api/vk-admin/collection-reports/7/resolve"),
        ("post", "/api/vk-admin/collection-reports/7/dismiss"),
        ("post", "/api/vk-admin/collection-reports/7/make-private"),
    ])
    async def test_a_member_is_refused(self, member_client, service, method, url):
        response = await getattr(member_client, method)(url)

        assert response.status_code == 403
        assert not service.method_calls

    async def test_the_admin_lists_open_reports_by_default(self, admin_client, service):
        service.list_reports.return_value = CollectionReportListResponse(
            items=[REPORT], total=1, page=1, limit=20, open_count=1)

        response = await admin_client.get("/api/vk-admin/collection-reports")

        assert response.status_code == 200
        assert response.json()["items"][0]["collection"]["owner"] == "bob"
        service.list_reports.assert_awaited_once_with("open", 1, 20)

    async def test_the_admin_resolves_and_dismisses(self, admin_client, service, mock_user):
        service.resolve.return_value = REPORT.model_copy(update={"status": "resolved"})
        service.dismiss.return_value = REPORT.model_copy(update={"status": "dismissed"})

        resolved = await admin_client.post("/api/vk-admin/collection-reports/7/resolve")
        dismissed = await admin_client.post("/api/vk-admin/collection-reports/7/dismiss")

        assert (resolved.json()["status"], dismissed.json()["status"]) == ("resolved", "dismissed")
        service.resolve.assert_awaited_once_with(7, mock_user)
        service.dismiss.assert_awaited_once_with(7, mock_user)

    async def test_the_admin_makes_the_reported_collection_private(self, admin_client, service, mock_user):
        service.make_private.return_value = REPORT.model_copy(update={
            "status": "resolved", "collection": COLLECTION.model_copy(update={"is_public": False})})

        response = await admin_client.post("/api/vk-admin/collection-reports/7/make-private")

        assert response.status_code == 200
        assert (response.json()["status"], response.json()["collection"]["is_public"]) == ("resolved", False)
        service.make_private.assert_awaited_once_with(7, mock_user)
