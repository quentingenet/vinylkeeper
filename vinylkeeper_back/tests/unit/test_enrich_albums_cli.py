"""CLI wiring for the album enrichment backfill (no database, no network)."""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

import app.cli.enrich_albums as cli
from app.services.mood_assignment_service import MoodAssignmentReport


@pytest.fixture(autouse=True)
def prices():
    """The prices pass runs by default: no database, no Discogs, no exchange rates here."""
    repository = MagicMock()
    repository.list_pending_prices = AsyncMock(return_value=[])
    service = MagicMock()
    service.refresh_prices = AsyncMock()
    service.work_requests = AsyncMock()
    with patch.object(cli, "AlbumPriceRepository", return_value=repository), \
            patch.object(cli, "AlbumPriceService", return_value=service), \
            patch.object(cli, "refresh_exchange_rates", new=AsyncMock()) as rates:
        yield MagicMock(repository=repository, service=service, rates=rates)


def patched_session():
    session = AsyncMock()
    session.__aenter__.return_value = session
    return patch.object(cli, "AsyncSessionLocal", return_value=session)


def test_parse_args_defaults_and_flags():
    assert vars(cli.parse_args([])) == {
        "limit": None, "dry_run": False, "skip_masters": False, "skip_editions": False,
        "refresh_titles": False, "skip_prices": False}
    args = cli.parse_args(["--limit", "20", "--dry-run", "--skip-masters", "--skip-editions"])
    assert (args.limit, args.dry_run, args.skip_masters, args.skip_editions) == (20, True, True, True)


async def test_dry_run_counts_without_calling_discogs(capsys):
    repository = AsyncMock()
    repository.list_pending_releases = AsyncMock(return_value=[(1, "a"), (2, "b")])
    repository.list_pending_masters = AsyncMock(return_value=["10"])
    repository.list_pending_editions = AsyncMock(return_value=[(3, "c")])

    with patched_session(), \
            patch.object(cli, "AlbumEnrichmentRepository", return_value=repository), \
            patch.object(cli, "AlbumEnrichmentService") as service_cls:
        await cli.run(cli.parse_args(["--dry-run"]))

    service_cls.assert_not_called()
    assert "2 release(s), 1 master(s), 1 pressing(s), 0 title(s), 0 price(s)" in capsys.readouterr().out


async def test_run_fetches_releases_then_masters_then_pressings():
    service = MagicMock()
    service.enrich_pending_releases = AsyncMock()
    service.enrich_pending_masters = AsyncMock()
    service.enrich_pending_editions = AsyncMock()

    with patched_session(), \
            patch.object(cli, "AlbumEnrichmentRepository"), \
            patch.object(cli, "AlbumEnrichmentService", return_value=service):
        await cli.run(cli.parse_args(["--limit", "20"]))

    assert service.enrich_pending_releases.await_args.args == (20,)
    assert service.enrich_pending_masters.await_args.args == (20,)
    assert service.enrich_pending_editions.await_args.args == (20,)


async def test_skip_editions():
    service = MagicMock()
    service.enrich_pending_releases = AsyncMock()
    service.enrich_pending_masters = AsyncMock()
    service.enrich_pending_editions = AsyncMock()

    with patched_session(), \
            patch.object(cli, "AlbumEnrichmentRepository"), \
            patch.object(cli, "AlbumEnrichmentService", return_value=service):
        await cli.run(cli.parse_args(["--skip-editions"]))

    service.enrich_pending_masters.assert_awaited_once()
    service.enrich_pending_editions.assert_not_called()


async def test_skip_masters_fetches_releases_only():
    service = MagicMock()
    service.enrich_pending_releases = AsyncMock()
    service.enrich_pending_masters = AsyncMock()
    service.enrich_pending_editions = AsyncMock()

    with patched_session(), \
            patch.object(cli, "AlbumEnrichmentRepository"), \
            patch.object(cli, "AlbumEnrichmentService", return_value=service):
        await cli.run(cli.parse_args(["--skip-masters"]))

    service.enrich_pending_releases.assert_awaited_once()
    service.enrich_pending_masters.assert_not_called()


def fake_enrichment_service(enriched_ids: list[int]) -> MagicMock:
    async def enrich_pending_releases(limit, report):
        report.enriched_album_ids.extend(enriched_ids)
        report.enriched += len(enriched_ids)
        return report

    service = MagicMock()
    service.enrich_pending_releases = AsyncMock(side_effect=enrich_pending_releases)
    service.enrich_pending_masters = AsyncMock()
    service.enrich_pending_editions = AsyncMock()
    return service


async def test_newly_enriched_albums_get_their_moods_before_masters():
    mood_service = MagicMock()
    mood_service.assign = AsyncMock(return_value=MoodAssignmentReport(with_moods=2))
    service = fake_enrichment_service([4, 9])

    with patched_session(), \
            patch.object(cli, "AlbumEnrichmentRepository"), \
            patch.object(cli, "AlbumEnrichmentService", return_value=service), \
            patch.object(cli, "MoodAssignmentRepository"), \
            patch.object(cli, "MoodAssignmentService", return_value=mood_service):
        await cli.run(cli.parse_args([]))

    mood_service.assign.assert_awaited_once_with([4, 9])
    service.enrich_pending_masters.assert_awaited_once()


async def test_no_mood_assignment_when_nothing_was_enriched():
    mood_service = MagicMock()
    mood_service.assign = AsyncMock()

    with patched_session(), \
            patch.object(cli, "AlbumEnrichmentRepository"), \
            patch.object(cli, "AlbumEnrichmentService", return_value=fake_enrichment_service([])), \
            patch.object(cli, "MoodAssignmentService", return_value=mood_service):
        await cli.run(cli.parse_args([]))

    mood_service.assign.assert_not_called()


async def test_dry_run_assigns_no_moods():
    repository = AsyncMock()
    repository.list_pending_releases = AsyncMock(return_value=[])
    repository.list_pending_masters = AsyncMock(return_value=[])
    repository.list_pending_editions = AsyncMock(return_value=[])

    with patched_session(), \
            patch.object(cli, "AlbumEnrichmentRepository", return_value=repository), \
            patch.object(cli, "MoodAssignmentService") as mood_service_cls:
        await cli.run(cli.parse_args(["--dry-run"]))

    mood_service_cls.assert_not_called()


async def test_refresh_titles_only_when_asked():
    service = MagicMock()
    for name in ("enrich_pending_releases", "enrich_pending_masters", "enrich_pending_editions",
                 "refresh_stale_titles"):
        setattr(service, name, AsyncMock())

    with patched_session(), \
            patch.object(cli, "AlbumEnrichmentRepository"), \
            patch.object(cli, "AlbumEnrichmentService", return_value=service):
        await cli.run(cli.parse_args([]))
        service.refresh_stale_titles.assert_not_called()
        await cli.run(cli.parse_args(["--refresh-titles", "--limit", "5"]))

    assert service.refresh_stale_titles.await_args.args == (5,)


async def test_rates_then_prices_unless_skipped(prices):
    service = MagicMock()
    for name in ("enrich_pending_releases", "enrich_pending_masters", "enrich_pending_editions"):
        setattr(service, name, AsyncMock())

    with patched_session(), \
            patch.object(cli, "AlbumEnrichmentRepository"), \
            patch.object(cli, "AlbumEnrichmentService", return_value=service):
        await cli.run(cli.parse_args(["--limit", "40"]))
        prices.rates.assert_awaited_once()
        prices.service.work_requests.assert_awaited_once()
        assert prices.service.refresh_prices.await_args.args == (40,)

        prices.service.refresh_prices.reset_mock()
        await cli.run(cli.parse_args(["--skip-prices"]))
        prices.service.refresh_prices.assert_not_called()
