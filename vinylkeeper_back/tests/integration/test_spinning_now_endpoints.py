"""Spinning now endpoints: routing, query parsing, auth and error mapping (service mocked)."""
from unittest.mock import AsyncMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.exceptions import ErrorCode, ValidationError
from app.deps.deps import get_spinning_now_service
from app.main import app
from app.schemas.spinning_now_schema import SpinningNowOptionsResponse, SpinningNowResponse


@pytest.fixture
async def client_with_service(auth_client):
    client, _, user = auth_client
    service = AsyncMock()
    app.dependency_overrides[get_spinning_now_service] = lambda: service
    yield client, service, user
    app.dependency_overrides.pop(get_spinning_now_service, None)


class TestSpinningNowEndpoints:
    async def test_options(self, client_with_service):
        client, service, user = client_with_service
        service.get_options = AsyncMock(return_value=SpinningNowOptionsResponse(
            total_albums=2, moods=[], eras=[{"decade": 1970, "albums_count": 2}], genres=[],
            collections=[{"id": 7, "name": "Mine", "albums_count": 2}]))

        resp = await client.get("/api/spinning-now/options")

        assert resp.status_code == 200
        assert resp.json()["eras"] == [{"decade": 1970, "albums_count": 2}]
        assert resp.json()["collections"] == [{"id": 7, "name": "Mine", "albums_count": 2}]
        service.get_options.assert_awaited_once_with(user.id)

    async def test_pick_parses_repeated_query_params(self, client_with_service):
        client, service, user = client_with_service
        service.pick = AsyncMock(return_value=SpinningNowResponse(total=0, items=[]))

        resp = await client.get(
            "/api/spinning-now/",
            params=[("moods", "calm"), ("moods", "dreamy"), ("eras", "1970"), ("genres", "Jazz"),
                    ("collections", "7"), ("collections", "8"), ("limit", "3")],
        )

        assert resp.status_code == 200
        service.pick.assert_awaited_once_with(user.id, ["calm", "dreamy"], [1970], ["Jazz"], [7, 8], 3)

    async def test_pick_without_filters_uses_defaults(self, client_with_service):
        client, service, user = client_with_service
        service.pick = AsyncMock(return_value=SpinningNowResponse(total=0, items=[]))

        await client.get("/api/spinning-now/")

        service.pick.assert_awaited_once_with(user.id, [], [], [], [], 12)

    async def test_non_numeric_era_is_rejected_by_fastapi(self, client_with_service):
        client, service, _ = client_with_service

        resp = await client.get("/api/spinning-now/", params={"eras": "seventies"})

        assert resp.status_code == 422
        service.pick.assert_not_called()

    async def test_service_validation_error_returns_400(self, client_with_service):
        client, service, _ = client_with_service
        service.pick = AsyncMock(side_effect=ValidationError(ErrorCode.INVALID_INPUT, "Unknown mood"))

        resp = await client.get("/api/spinning-now/", params={"moods": "unknown"})

        assert resp.status_code == 400


async def test_requires_authentication():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        assert (await client.get("/api/spinning-now/options")).status_code == 401
        assert (await client.get("/api/spinning-now/")).status_code == 401
