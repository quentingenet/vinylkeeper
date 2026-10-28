import pytest
from unittest.mock import AsyncMock

from app.services.search_service import SearchService
from app.core.exceptions import ServerError


def make_service_with_failing_client(exc: Exception) -> SearchService:
    client = AsyncMock()
    client.get = AsyncMock(side_effect=exc)
    return SearchService(http_client=client)


class TestGetArtistMetadataErrorLeak:
    async def test_unexpected_error_does_not_leak_exception_text(self):
        """Regression test: details used to include str(e), which could leak
        internal network/timeout/URL details straight into the HTTP response
        (app/core/handlers.py forwards ServerError.detail verbatim to the
        client). details must only contain the safe artist_id identifier."""
        service = make_service_with_failing_client(
            RuntimeError("connection refused to internal-host:5432, secret=abc123")
        )

        with pytest.raises(ServerError) as exc_info:
            await service.get_artist_metadata("123")

        details = exc_info.value.detail["details"]
        assert details == {"artist_id": "123"}
        assert "secret" not in str(details)
        assert "internal-host" not in str(details)


class TestGetAlbumMetadataErrorLeak:
    async def test_unexpected_error_does_not_leak_exception_text(self):
        service = make_service_with_failing_client(
            RuntimeError("connection refused to internal-host:5432, secret=abc123")
        )

        with pytest.raises(ServerError) as exc_info:
            await service.get_album_metadata("456")

        details = exc_info.value.detail["details"]
        assert details == {"album_id": "456"}
        assert "secret" not in str(details)
        assert "internal-host" not in str(details)


# ---------------------------------------------------------------------------
# search_music: behaviour contract (Discogs simulated with httpx.MockTransport)
# ---------------------------------------------------------------------------
import httpx  # noqa: E402

from app.core.exceptions import ValidationError  # noqa: E402
from app.schemas.request_proxy.request_proxy_schema import SearchQuery  # noqa: E402

COVER = "https://i.discogs.com/sig/rs:fit/g:sm/q:90/h:600/w:600/czM6Ly9kaXNjb2dz/R-1.jpeg"
THUMB = "https://i.discogs.com/sig/rs:fit/g:sm/q:40/h:150/w:150/czM6Ly9kaXNjb2dz/R-1.jpeg"
SPACER = "https://st.discogs.com/abc/images/spacer.gif"


def release_hit(release_id: int, title: str, formats=("Vinyl", "LP"), cover=COVER, thumb=THUMB) -> dict:
    return {"id": release_id, "type": "release", "title": title, "format": list(formats),
            "cover_image": cover, "thumb": thumb}


def artist_hit(artist_id: int, name: str, cover=COVER, thumb=THUMB) -> dict:
    return {"id": artist_id, "type": "artist", "title": name, "cover_image": cover, "thumb": thumb}


def discogs(hits: list[dict], search_status: int = 200):
    """Discogs double: search returns `hits`; detail endpoints return the hit's own image, like the real API."""
    requests: list[str] = []
    by_id = {str(hit["id"]): hit for hit in hits}

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request.url.path)
        if request.url.path.endswith("/database/search"):
            return httpx.Response(search_status, json={"results": hits})
        hit = by_id.get(request.url.path.rsplit("/", 1)[-1], {})
        image = hit.get("cover_image")
        has_image = image and "spacer.gif" not in image
        images = [{"type": "primary", "uri": image, "uri150": hit["thumb"]}] if has_image else []
        return httpx.Response(200, json={"images": images})

    service = SearchService(http_client=httpx.AsyncClient(transport=httpx.MockTransport(handler)))
    return service, requests


class TestSearchMusic:
    async def test_release_picture_and_medium_size(self):
        service, _ = discogs([release_hit(1, "Miles Davis - Kind Of Blue")])

        [result] = await service.search_music(SearchQuery(query="kind of blue", is_artist=False))

        assert result.picture == COVER
        assert result.picture_medium == SearchService.resize_to_medium(COVER)
        assert (result.id, result.title, result.type) == ("1", "Miles Davis - Kind Of Blue", "album")
        assert result.artist is None  # Discogs search hits carry "Artist - Title" in the title only

    async def test_artist_picture(self):
        service, _ = discogs([artist_hit(10, "John Coltrane")])

        [result] = await service.search_music(SearchQuery(query="coltrane", is_artist=True))

        assert (result.name, result.type, result.picture) == ("John Coltrane", "artist", COVER)

    async def test_artist_without_image_gets_no_picture(self):
        """Discogs returns a spacer.gif placeholder in search hits for artists without image."""
        service, _ = discogs([artist_hit(11, "Sita Coltrane", cover=SPACER, thumb="")])

        [result] = await service.search_music(SearchQuery(query="sita coltrane", is_artist=True))

        assert result.picture == ""
        assert result.picture_medium is None

    async def test_non_vinyl_releases_are_filtered_out(self):
        service, _ = discogs([release_hit(1, "A - CD only", formats=("CD", "Album")), release_hit(2, "B - LP")])

        results = await service.search_music(SearchQuery(query="test", is_artist=False))

        assert [r.id for r in results] == ["2"]

    async def test_duplicate_releases_are_deduplicated(self):
        service, _ = discogs([release_hit(1, "Brel - Brel"), release_hit(2, "Brel - Brel")])

        results = await service.search_music(SearchQuery(query="brel", is_artist=False))

        assert [r.id for r in results] == ["1"]

    async def test_at_most_ten_results(self):
        service, _ = discogs([artist_hit(i, f"Artist {i}") for i in range(1, 16)])

        results = await service.search_music(SearchQuery(query="artist", is_artist=True))

        assert len(results) == 10

    async def test_discogs_search_error_raises_server_error(self):
        service, _ = discogs([], search_status=503)

        with pytest.raises(ServerError):
            await service.search_music(SearchQuery(query="kind of blue", is_artist=False))

    @pytest.mark.parametrize("query", ["a", "x" * 101])
    async def test_query_length_is_validated(self, query):
        service, requests = discogs([])

        with pytest.raises(ValidationError):
            await service.search_music(SearchQuery(query=query, is_artist=False))
        assert requests == []


class TestSearchMusicPerformance:
    async def test_one_discogs_call_per_search(self):
        """Images used to cost one extra Discogs call per result (up to 11 calls per search)."""
        service, requests = discogs([artist_hit(i, f"Artist {i}") for i in range(1, 16)])

        results = await service.search_music(SearchQuery(query="artist", is_artist=True))

        assert len(results) == 10
        assert requests == ["/database/search"]

    async def test_release_without_image_never_exposes_the_placeholder(self):
        """The old code returned the spacer.gif URL for releases, which was then stored as image_url."""
        service, _ = discogs([release_hit(1, "Unknown - Private Press", cover=SPACER, thumb="")])

        [result] = await service.search_music(SearchQuery(query="private press", is_artist=False))

        assert result.picture == ""
        assert result.picture_medium is None

    async def test_thumb_is_used_when_only_the_thumbnail_exists(self):
        service, _ = discogs([artist_hit(1, "Someone", cover=SPACER, thumb=THUMB)])

        [result] = await service.search_music(SearchQuery(query="someone", is_artist=True))

        assert result.picture == THUMB
        assert result.picture_medium is None
