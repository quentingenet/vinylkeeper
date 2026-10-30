import pytest
from unittest.mock import AsyncMock

from app.services.search_service import SEARCH_PAGE_SIZE, SearchService
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
from pydantic import ValidationError as PydanticValidationError  # noqa: E402
from app.schemas.request_proxy.request_proxy_schema import SEARCH_MAX_PAGES, SearchQuery  # noqa: E402

COVER = "https://i.discogs.com/sig/rs:fit/g:sm/q:90/h:600/w:600/czM6Ly9kaXNjb2dz/R-1.jpeg"
THUMB = "https://i.discogs.com/sig/rs:fit/g:sm/q:40/h:150/w:150/czM6Ly9kaXNjb2dz/R-1.jpeg"
SPACER = "https://st.discogs.com/abc/images/spacer.gif"


def release_hit(release_id: int, title: str, formats=("Vinyl", "LP"), cover=COVER, thumb=THUMB, **edition) -> dict:
    return {"id": release_id, "type": "release", "title": title, "format": list(formats),
            "cover_image": cover, "thumb": thumb, **edition}


def artist_hit(artist_id: int, name: str, cover=COVER, thumb=THUMB) -> dict:
    return {"id": artist_id, "type": "artist", "title": name, "cover_image": cover, "thumb": thumb}


def discogs(hits: list[dict], search_status: int = 200, pages: int = 1, sent_params: list | None = None):
    """Discogs double: search returns `hits`; detail endpoints return the hit's own image, like the real API."""
    requests: list[str] = []
    by_id = {str(hit["id"]): hit for hit in hits}

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request.url.path)
        if request.url.path.endswith("/database/search"):
            if sent_params is not None:
                sent_params.append(dict(request.url.params))
            return httpx.Response(search_status, json={"results": hits, "pagination": {"pages": pages}})
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

        [result] = (await service.search_music_page(SearchQuery(query="kind of blue", is_artist=False))).items

        assert result.picture == COVER
        assert result.picture_medium == SearchService.resize_to_medium(COVER)
        assert (result.id, result.title, result.type) == ("1", "Miles Davis - Kind Of Blue", "album")
        assert result.artist is None  # Discogs search hits carry "Artist - Title" in the title only

    async def test_artist_picture(self):
        service, _ = discogs([artist_hit(10, "John Coltrane")])

        [result] = (await service.search_music_page(SearchQuery(query="coltrane", is_artist=True))).items

        assert (result.name, result.type, result.picture) == ("John Coltrane", "artist", COVER)

    async def test_artist_homonym_marker_is_removed(self):
        service, _ = discogs([artist_hit(12, "Jimmy Smith (12)")])

        [result] = (await service.search_music_page(SearchQuery(query="jimmy smith", is_artist=True))).items

        assert result.name == "Jimmy Smith"

    async def test_artist_without_image_gets_no_picture(self):
        """Discogs returns a spacer.gif placeholder in search hits for artists without image."""
        service, _ = discogs([artist_hit(11, "Sita Coltrane", cover=SPACER, thumb="")])

        [result] = (await service.search_music_page(SearchQuery(query="sita coltrane", is_artist=True))).items

        assert result.picture == ""
        assert result.picture_medium is None

    async def test_non_vinyl_releases_are_filtered_out(self):
        service, _ = discogs([release_hit(1, "A - CD only", formats=("CD", "Album")), release_hit(2, "B - LP")])

        results = (await service.search_music_page(SearchQuery(query="test", is_artist=False))).items

        assert [r.id for r in results] == ["2"]

    async def test_duplicate_releases_are_deduplicated(self):
        service, _ = discogs([release_hit(1, "Brel - Brel"), release_hit(2, "Brel - Brel")])

        results = (await service.search_music_page(SearchQuery(query="brel", is_artist=False))).items

        assert [r.id for r in results] == ["1"]

    async def test_at_most_one_page_of_results(self):
        service, _ = discogs([artist_hit(i, f"Artist {i}") for i in range(1, 16)])

        results = (await service.search_music_page(SearchQuery(query="artist", is_artist=True))).items

        assert len(results) == SEARCH_PAGE_SIZE

    async def test_discogs_search_error_raises_server_error(self):
        service, _ = discogs([], search_status=503)

        with pytest.raises(ServerError):
            (await service.search_music_page(SearchQuery(query="kind of blue", is_artist=False))).items

    @pytest.mark.parametrize("query", ["a", "x" * 101])
    async def test_query_length_is_validated(self, query):
        service, requests = discogs([])

        with pytest.raises(ValidationError):
            (await service.search_music_page(SearchQuery(query=query, is_artist=False))).items
        assert requests == []


class TestSearchMusicPerformance:
    async def test_one_discogs_call_per_search(self):
        """Images used to cost one extra Discogs call per result (up to 11 calls per search)."""
        service, requests = discogs([artist_hit(i, f"Artist {i}") for i in range(1, 16)])

        results = (await service.search_music_page(SearchQuery(query="artist", is_artist=True))).items

        assert len(results) == SEARCH_PAGE_SIZE
        assert requests == ["/database/search"]

    async def test_release_without_image_never_exposes_the_placeholder(self):
        """The old code returned the spacer.gif URL for releases, which was then stored as image_url."""
        service, _ = discogs([release_hit(1, "Unknown - Private Press", cover=SPACER, thumb="")])

        [result] = (await service.search_music_page(SearchQuery(query="private press", is_artist=False))).items

        assert result.picture == ""
        assert result.picture_medium is None

    async def test_thumb_is_used_when_only_the_thumbnail_exists(self):
        service, _ = discogs([artist_hit(1, "Someone", cover=SPACER, thumb=THUMB)])

        [result] = (await service.search_music_page(SearchQuery(query="someone", is_artist=True))).items

        assert result.picture == THUMB
        assert result.picture_medium is None


class TestSearchMusicEditions:
    async def test_edition_fields_come_from_the_search_hit(self):
        hit = release_hit(1, "Miles Davis - Kind Of Blue", formats=("Vinyl", "LP", "Album", "Reissue", "Vinyl"),
                          year="2019", country="Europe", label=["Columbia", "Legacy"], catno="CL 1355",
                          master_id=5460)
        service, _ = discogs([hit])

        [result] = (await service.search_music_page(SearchQuery(query="kind of blue", is_artist=False))).items

        assert (result.year, result.country, result.label, result.catno) == ("2019", "Europe", "Columbia", "CL 1355")
        assert result.formats == ["LP", "Album", "Reissue"]
        assert result.master_id == "5460"

    async def test_missing_edition_fields_are_empty(self):
        service, _ = discogs([release_hit(1, "A - B", master_id=0, label=[], catno="", country="")])

        [result] = (await service.search_music_page(SearchQuery(query="test", is_artist=False))).items

        assert (result.year, result.country, result.label, result.catno, result.master_id) == (None,) * 5

    async def test_different_pressings_of_the_same_album_are_all_listed(self):
        service, _ = discogs([
            release_hit(1, "Brel - Brel", year="1977", country="France", catno="9101 155"),
            release_hit(2, "Brel - Brel", year="2016", country="Europe", catno="4781234"),
        ])

        results = (await service.search_music_page(SearchQuery(query="brel", is_artist=False))).items

        assert [r.id for r in results] == ["1", "2"]

    async def test_identical_editions_are_still_deduplicated(self):
        edition = {"year": "1977", "country": "France", "label": ["Barclay"], "catno": "9101 155"}
        service, _ = discogs([release_hit(1, "Brel - Brel", **edition), release_hit(2, "Brel - Brel", **edition)])

        results = (await service.search_music_page(SearchQuery(query="brel", is_artist=False))).items

        assert [r.id for r in results] == ["1"]


class TestSearchMusicPagination:
    async def test_requested_page_is_sent_and_vinyl_filtered_by_discogs(self):
        sent: list = []
        service, _ = discogs([release_hit(1, "A - B")], pages=7, sent_params=sent)

        result = await service.search_music_page(SearchQuery(query="test", is_artist=False, page=3))

        assert (result.page, result.total_pages) == (3, 7)
        assert sent[0]["page"] == "3"
        assert sent[0]["per_page"] == str(SEARCH_PAGE_SIZE)
        assert sent[0]["format"] == "Vinyl"

    async def test_artist_search_is_not_filtered_by_format(self):
        sent: list = []
        service, _ = discogs([artist_hit(1, "Brel")], sent_params=sent)

        await service.search_music_page(SearchQuery(query="brel", is_artist=True))

        assert "format" not in sent[0]

    async def test_number_of_pages_is_capped(self):
        service, _ = discogs([release_hit(1, "A - B")], pages=4000)

        result = await service.search_music_page(SearchQuery(query="test", is_artist=False))

        assert result.total_pages == SEARCH_MAX_PAGES

    async def test_no_result_is_one_empty_page(self):
        service, _ = discogs([], pages=0)

        result = await service.search_music_page(SearchQuery(query="zzzz", is_artist=False))

        assert (result.items, result.page, result.total_pages) == ([], 1, 1)

    @pytest.mark.parametrize("page", [0, SEARCH_MAX_PAGES + 1])
    def test_page_out_of_range_is_rejected(self, page):
        with pytest.raises(PydanticValidationError):
            SearchQuery(query="test", page=page)


class TestAlbumMetadataEdition:
    async def test_edition_fields_come_from_the_release_detail(self):
        release = {
            "id": 1353040, "title": "Kind Of Blue", "year": 1959, "country": "US",
            "labels": [{"name": "Columbia (2)", "catno": "CS 8163"}, {"name": "Other", "catno": "X"}],
            "formats": [{"name": "Vinyl", "descriptions": ["LP", "Album", "Stereo"]}, {"name": "Box Set"}],
        }
        service = SearchService(http_client=httpx.AsyncClient(
            transport=httpx.MockTransport(lambda request: httpx.Response(200, json=release))))

        metadata = await service.get_album_metadata("1353040")

        assert (metadata.country, metadata.label, metadata.catno) == ("US", "Columbia", "CS 8163")
        assert metadata.formats == ["LP", "Album", "Stereo", "Box Set"]

    async def test_unknown_edition_fields_are_empty(self):
        release = {"id": 1, "title": "Demo", "labels": [{"name": "Not On Label", "catno": "none"}]}
        service = SearchService(http_client=httpx.AsyncClient(
            transport=httpx.MockTransport(lambda request: httpx.Response(200, json=release))))

        metadata = await service.get_album_metadata("1")

        assert (metadata.country, metadata.catno, metadata.formats) == (None, None, [])
