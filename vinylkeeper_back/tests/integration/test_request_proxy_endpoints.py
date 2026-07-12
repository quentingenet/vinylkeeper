from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.deps.deps import get_search_service


# ---------------------------------------------------------------------------
# Regression tests: /api/request-proxy/* used to be reachable without
# authentication, letting anyone consume the app's Discogs API quota.
# ---------------------------------------------------------------------------

@pytest.fixture
async def raw_client():
    """No auth override — used to confirm the endpoints reject anonymous
    requests. get_search_service is overridden too: it needs
    app.state.http_client, only set up by the real app lifespan, and is
    irrelevant to what's being tested here (the auth gate must reject the
    request before the search service is ever touched)."""
    app.dependency_overrides[get_search_service] = lambda: AsyncMock()
    with patch("app.core.lifespan.check_reference_data_exists", new_callable=AsyncMock, return_value=True):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            yield c
    app.dependency_overrides.clear()


class TestSearchMusicRequiresAuth:
    async def test_anonymous_request_returns_401(self, raw_client):
        response = await raw_client.post(
            "/api/request-proxy/search-music",
            json={"query": "Daft Punk", "is_artist": True},
        )
        assert response.status_code == 401

    async def test_authenticated_request_succeeds(self, auth_client):
        client, _mock_service, _mock_user = auth_client
        mock_search_service = AsyncMock()
        mock_search_service.search_music = AsyncMock(return_value=[])
        app.dependency_overrides[get_search_service] = lambda: mock_search_service

        response = await client.post(
            "/api/request-proxy/search-music",
            json={"query": "Daft Punk", "is_artist": True},
        )
        assert response.status_code == 200
        mock_search_service.search_music.assert_awaited_once()


class TestArtistMetadataRequiresAuth:
    async def test_anonymous_request_returns_401(self, raw_client):
        response = await raw_client.get("/api/request-proxy/music-metadata/artist/123")
        assert response.status_code == 401


class TestAlbumMetadataRequiresAuth:
    async def test_anonymous_request_returns_401(self, raw_client):
        response = await raw_client.get("/api/request-proxy/music-metadata/album/456")
        assert response.status_code == 401
