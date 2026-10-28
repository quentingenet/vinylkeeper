from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.deps.deps import get_search_service
from app.schemas.request_proxy.request_proxy_schema import SearchResultsPage


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


class TestUnpaginatedSearchIsGone:
    async def test_old_route_no_longer_exists(self, auth_client):
        """Only the deployed Android build used it; the app searches page by page."""
        client, *_ = auth_client
        response = await client.post("/api/request-proxy/search-music", json={"query": "Daft Punk"})
        assert response.status_code in (404, 405)


class TestSearchMusicPage:
    async def test_anonymous_request_returns_401(self, raw_client):
        response = await raw_client.post("/api/request-proxy/search-music/page", json={"query": "Brel"})
        assert response.status_code == 401

    async def test_returns_the_page_and_number_of_pages(self, auth_client):
        client, _mock_service, _mock_user = auth_client
        mock_search_service = AsyncMock()
        mock_search_service.search_music_page = AsyncMock(
            return_value=SearchResultsPage(items=[], page=2, total_pages=5))
        app.dependency_overrides[get_search_service] = lambda: mock_search_service

        response = await client.post("/api/request-proxy/search-music/page", json={"query": "Brel", "page": 2})

        assert response.status_code == 200
        assert response.json() == {"items": [], "page": 2, "total_pages": 5}
        assert mock_search_service.search_music_page.await_args.args[0].page == 2


class TestArtistMetadataRequiresAuth:
    async def test_anonymous_request_returns_401(self, raw_client):
        response = await raw_client.get("/api/request-proxy/music-metadata/artist/123")
        assert response.status_code == 401


class TestAlbumMetadataRequiresAuth:
    async def test_anonymous_request_returns_401(self, raw_client):
        response = await raw_client.get("/api/request-proxy/music-metadata/album/456")
        assert response.status_code == 401
