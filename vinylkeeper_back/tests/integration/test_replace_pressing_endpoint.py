"""Pressing routes of /external-references: replace a pressing, list the pressings already owned"""
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.exceptions import ForbiddenError
from app.deps.deps import get_external_reference_service
from app.main import app
from app.schemas.collection_schema import CollectionAlbumResponse
from app.utils.auth_utils.auth import TokenType, create_token, get_current_user

URL = "/api/external-references/collection/1/albums/10/replace"
BODY = {"external_id": "1353040", "entity_type": "album", "title": "Kind Of Blue", "image_url": "",
        "source": "discogs"}


@pytest.fixture
async def ref_client(mock_user):
    service = AsyncMock()
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_external_reference_service] = lambda: service
    with patch("app.core.lifespan.check_reference_data_exists", new_callable=AsyncMock, return_value=True), \
            patch("app.endpoints.external_references.enrich_album_in_background", new=AsyncMock()):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            client.cookies.set("access_token", create_token(str(mock_user.user_uuid), TokenType.ACCESS))
            yield client, service, mock_user
    app.dependency_overrides.clear()


class TestReplacePressing:
    async def test_returns_the_album_in_its_new_pressing(self, ref_client):
        client, service, user = ref_client
        now = datetime.now(timezone.utc)
        service.replace_pressing = AsyncMock(return_value=CollectionAlbumResponse(
            id=99, external_album_id="1353040", external_source_id=1, title="Kind Of Blue",
            created_at=now, updated_at=now, pressing_confirmed=True))

        resp = await client.post(URL, json=BODY)

        assert resp.status_code == 200
        assert (resp.json()["id"], resp.json()["pressing_confirmed"]) == (99, True)
        args = service.replace_pressing.await_args.args
        assert args[:3] == (user.id, 1, 10)
        assert args[3].external_id == "1353040"

    async def test_artist_is_rejected(self, ref_client):
        client, *_ = ref_client
        resp = await client.post(URL, json={**BODY, "entity_type": "artist"})
        assert resp.status_code == 422

    async def test_non_owner_gets_403(self, ref_client):
        client, service, _ = ref_client
        service.replace_pressing = AsyncMock(side_effect=ForbiddenError())
        resp = await client.post(URL, json=BODY)
        assert resp.status_code == 403

    async def test_anonymous_gets_401(self, client):
        resp = await client.post(URL, json=BODY)
        assert resp.status_code == 401


class TestOwnedPressings:
    async def test_passes_release_and_master(self, ref_client):
        client, service, user = ref_client
        service.find_owned_pressings = AsyncMock(return_value=[])

        resp = await client.get("/api/external-references/collection/owned?external_id=1353040&master_id=5460")

        assert resp.status_code == 200
        assert resp.json() == []
        service.find_owned_pressings.assert_awaited_once_with(user.id, "1353040", "5460")

    async def test_release_is_required(self, ref_client):
        client, *_ = ref_client
        resp = await client.get("/api/external-references/collection/owned")
        assert resp.status_code == 422

    async def test_anonymous_gets_401(self, client):
        resp = await client.get("/api/external-references/collection/owned?external_id=1")
        assert resp.status_code == 401
