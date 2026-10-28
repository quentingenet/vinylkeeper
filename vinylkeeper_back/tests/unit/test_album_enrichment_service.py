"""
Discogs album enrichment: payload parsing, rate-limit handling, enrichment flow
and the guarantee that background enrichment never breaks an album addition.
No network: Discogs is simulated with httpx.MockTransport.
"""
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

import app.services.album_enrichment_service as enrichment_module
from app.services.album_enrichment_service import (
    AlbumEnrichmentService,
    DiscogsClient,
    DiscogsUnavailableError,
    enrich_album_in_background,
    parse_master_year,
    parse_release,
)

# Shape of a real /releases/380980 response (AC/DC - Highway To Hell), trimmed
HIGHWAY_TO_HELL = {
    "id": 380980,
    "title": "Highway To Hell",
    "year": 1979,
    "master_id": 8522,
    "genres": ["Rock"],
    "styles": ["Hard Rock"],
    "artists": [{"id": 84752, "name": "AC/DC", "anv": ""}],
}


@pytest.fixture(autouse=True)
def no_real_sleep():
    """Back-off and throttling must not slow the test suite down."""
    with patch.object(enrichment_module.asyncio, "sleep", new=AsyncMock()) as sleep:
        yield sleep


def make_client(handler, max_attempts: int = 5) -> DiscogsClient:
    http_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    return DiscogsClient(http_client, max_attempts=max_attempts, min_interval=0)


class TestParseRelease:
    def test_real_payload_with_master(self):
        values = parse_release(HIGHWAY_TO_HELL)

        assert values == {
            "external_master_id": "8522",
            "release_year": 1979,
            "artist_name": "AC/DC",
            "genres": ["Rock"],
            "styles": ["Hard Rock"],
            "original_year": None,
            "enrichment_status": "pending_master",
        }

    def test_release_without_master_is_complete_and_uses_its_own_year(self):
        values = parse_release({**HIGHWAY_TO_HELL, "master_id": None})

        assert values["external_master_id"] is None
        assert values["original_year"] == 1979
        assert values["enrichment_status"] == "ok"

    @pytest.mark.parametrize("year", [0, None, "1979", 99999])
    def test_unknown_or_invalid_year_becomes_null(self, year):
        values = parse_release({**HIGHWAY_TO_HELL, "year": year, "master_id": None})

        assert values["release_year"] is None
        assert values["original_year"] is None

    def test_discogs_disambiguation_markers_are_removed(self):
        values = parse_release({**HIGHWAY_TO_HELL, "artists": [
            {"name": "Wings (2)"}, {"name": "Al (He's The King) Hirt*"},
        ]})

        assert values["artist_name"] == "Wings, Al (He's The King) Hirt"

    def test_tags_are_trimmed_deduplicated_and_ordered(self):
        values = parse_release({**HIGHWAY_TO_HELL, "styles": [" Hard Rock", "Hard Rock", "", None, "Blues Rock"]})

        assert values["styles"] == ["Hard Rock", "Blues Rock"]

    def test_minimal_payload_does_not_crash(self):
        values = parse_release({"id": 1})

        assert values["artist_name"] is None
        assert values["genres"] == [] and values["styles"] == []
        assert values["enrichment_status"] == "ok"

    def test_artist_name_fits_the_column(self):
        values = parse_release({**HIGHWAY_TO_HELL, "artists": [{"name": "x" * 600}]})

        assert len(values["artist_name"]) == 512


class TestParseMasterYear:
    @pytest.mark.parametrize("data, expected", [
        ({"year": 1959}, 1959), ({"year": 0}, None), ({}, None), (None, None),
    ])
    def test_master_year(self, data, expected):
        assert parse_master_year(data) == expected


class TestDiscogsClient:
    async def test_returns_json_and_sends_auth_and_user_agent(self):
        seen = {}

        def handler(request: httpx.Request) -> httpx.Response:
            seen.update(request.headers)
            seen["path"] = request.url.path
            return httpx.Response(200, json=HIGHWAY_TO_HELL)

        data = await make_client(handler).get("/releases/380980")

        assert data["master_id"] == 8522
        assert seen["path"] == "/releases/380980"
        assert seen["authorization"].startswith("Discogs token=")
        assert seen["user-agent"]

    async def test_404_returns_none(self):
        assert await make_client(lambda r: httpx.Response(404)).get("/releases/1") is None

    async def test_429_is_retried_then_succeeds(self, no_real_sleep):
        responses = iter([httpx.Response(429), httpx.Response(429), httpx.Response(200, json={"ok": True})])

        data = await make_client(lambda r: next(responses)).get("/releases/1")

        assert data == {"ok": True}
        assert no_real_sleep.await_count >= 2

    async def test_429_exhausted_raises_unavailable(self):
        with pytest.raises(DiscogsUnavailableError):
            await make_client(lambda r: httpx.Response(429), max_attempts=3).get("/releases/1")

    async def test_server_error_raises_unavailable(self):
        with pytest.raises(DiscogsUnavailableError):
            await make_client(lambda r: httpx.Response(502)).get("/releases/1")

    async def test_network_error_raises_unavailable(self):
        def handler(request):
            raise httpx.ConnectError("boom")

        with pytest.raises(DiscogsUnavailableError):
            await make_client(handler).get("/releases/1")

    async def test_pauses_when_rate_limit_nearly_exhausted(self, no_real_sleep):
        handler = lambda r: httpx.Response(200, json={}, headers={"X-Discogs-Ratelimit-Remaining": "1"})  # noqa: E731

        await make_client(handler).get("/releases/1")

        no_real_sleep.assert_any_await(enrichment_module.LOW_REMAINING_PAUSE_SECONDS)


def make_service(client_get=None, known_year=None):
    repository = AsyncMock()
    repository.db = AsyncMock()
    repository.find_known_original_year = AsyncMock(return_value=known_year)
    repository.save_master_year = AsyncMock(return_value=2)
    client = MagicMock()
    client.get = client_get or AsyncMock(return_value=HIGHWAY_TO_HELL)
    return AlbumEnrichmentService(repository, client), repository, client


class TestAlbumEnrichmentService:
    async def test_enrich_release_saves_parsed_values(self):
        service, repository, _ = make_service()

        assert await service.enrich_release(7, "380980") == "enriched"
        repository.save_release.assert_awaited_once_with(7, parse_release(HIGHWAY_TO_HELL))

    async def test_enrich_release_marks_not_found(self):
        service, repository, _ = make_service(client_get=AsyncMock(return_value=None))

        assert await service.enrich_release(7, "1") == "not_found"
        repository.mark_release_not_found.assert_awaited_once_with(7)
        repository.save_release.assert_not_called()

    async def test_master_reuses_known_year_without_calling_discogs(self):
        service, repository, client = make_service(known_year=1959)

        assert await service.enrich_master("5460") == 2
        client.get.assert_not_called()
        repository.save_master_year.assert_awaited_once_with("5460", 1959)

    async def test_master_year_fetched_when_unknown(self):
        service, repository, client = make_service(client_get=AsyncMock(return_value={"year": 1979}))

        await service.enrich_master("8522")
        client.get.assert_awaited_once_with("/masters/8522")
        repository.save_master_year.assert_awaited_once_with("8522", 1979)

    async def test_pending_releases_continue_after_a_failure_and_commit(self):
        client_get = AsyncMock(side_effect=[HIGHWAY_TO_HELL, DiscogsUnavailableError("down"), None])
        service, repository, _ = make_service(client_get=client_get)
        repository.list_pending_releases = AsyncMock(return_value=[(1, "a"), (2, "b"), (3, "c")])

        report = await service.enrich_pending_releases(commit_every=2)

        assert (report.enriched, report.not_found, report.failed) == (1, 1, ["b"])
        assert repository.db.commit.await_count == 2  # one batch commit + the final one

    async def test_pending_masters_report(self):
        service, repository, _ = make_service(client_get=AsyncMock(return_value={"year": 1970}))
        repository.list_pending_masters = AsyncMock(return_value=["10", "11"])

        report = await service.enrich_pending_masters()

        assert report.masters_done == 2
        assert report.master_rows_updated == 4


class TestBackgroundEnrichment:
    async def test_disabled_does_nothing(self):
        with patch.object(enrichment_module.settings, "ALBUM_ENRICHMENT_ENABLED", False), \
                patch.object(enrichment_module, "AsyncSessionLocal") as session_factory:
            await enrich_album_in_background("380980")

        session_factory.assert_not_called()

    async def test_never_raises(self):
        with patch.object(enrichment_module.settings, "ALBUM_ENRICHMENT_ENABLED", True), \
                patch.object(enrichment_module, "AsyncSessionLocal", side_effect=RuntimeError("db down")):
            await enrich_album_in_background("380980")  # must not raise

    async def test_already_enriched_album_makes_no_discogs_call(self):
        repository = AsyncMock()
        repository.get_pending_release_by_external_id = AsyncMock(return_value=None)
        session = AsyncMock()
        session.__aenter__.return_value = session

        with patch.object(enrichment_module.settings, "ALBUM_ENRICHMENT_ENABLED", True), \
                patch.object(enrichment_module, "AsyncSessionLocal", return_value=session), \
                patch.object(enrichment_module, "AlbumEnrichmentRepository", return_value=repository), \
                patch.object(enrichment_module, "AlbumEnrichmentService") as service_cls:
            await enrich_album_in_background("380980")

        service_cls.assert_not_called()

    async def test_enriches_release_then_master(self):
        repository = AsyncMock()
        repository.get_pending_release_by_external_id = AsyncMock(return_value=7)
        repository.get_pending_master = AsyncMock(return_value="8522")
        session = AsyncMock()
        session.__aenter__.return_value = session
        service = AsyncMock()
        service.enrich_release = AsyncMock(return_value="enriched")

        with patch.object(enrichment_module.settings, "ALBUM_ENRICHMENT_ENABLED", True), \
                patch.object(enrichment_module, "AsyncSessionLocal", return_value=session), \
                patch.object(enrichment_module, "AlbumEnrichmentRepository", return_value=repository), \
                patch.object(enrichment_module, "AlbumEnrichmentService", return_value=service):
            await enrich_album_in_background("380980")

        service.enrich_release.assert_awaited_once_with(7, "380980")
        service.enrich_master.assert_awaited_once_with("8522")
        assert session.commit.await_count == 2
