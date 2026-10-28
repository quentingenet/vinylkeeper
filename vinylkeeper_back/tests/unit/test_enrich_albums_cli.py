"""CLI wiring for the album enrichment backfill (no database, no network)."""
from unittest.mock import AsyncMock, MagicMock, patch

import app.cli.enrich_albums as cli


def patched_session():
    session = AsyncMock()
    session.__aenter__.return_value = session
    return patch.object(cli, "AsyncSessionLocal", return_value=session)


def test_parse_args_defaults_and_flags():
    assert vars(cli.parse_args([])) == {"limit": None, "dry_run": False, "skip_masters": False}
    args = cli.parse_args(["--limit", "20", "--dry-run", "--skip-masters"])
    assert (args.limit, args.dry_run, args.skip_masters) == (20, True, True)


async def test_dry_run_counts_without_calling_discogs(capsys):
    repository = AsyncMock()
    repository.list_pending_releases = AsyncMock(return_value=[(1, "a"), (2, "b")])
    repository.list_pending_masters = AsyncMock(return_value=["10"])

    with patched_session(), \
            patch.object(cli, "AlbumEnrichmentRepository", return_value=repository), \
            patch.object(cli, "AlbumEnrichmentService") as service_cls:
        await cli.run(cli.parse_args(["--dry-run"]))

    service_cls.assert_not_called()
    assert "2 release(s), 1 master(s)" in capsys.readouterr().out


async def test_run_fetches_releases_then_masters():
    service = MagicMock()
    service.enrich_pending_releases = AsyncMock()
    service.enrich_pending_masters = AsyncMock()

    with patched_session(), \
            patch.object(cli, "AlbumEnrichmentRepository"), \
            patch.object(cli, "AlbumEnrichmentService", return_value=service):
        await cli.run(cli.parse_args(["--limit", "20"]))

    assert service.enrich_pending_releases.await_args.args == (20,)
    assert service.enrich_pending_masters.await_args.args == (20,)


async def test_skip_masters_fetches_releases_only():
    service = MagicMock()
    service.enrich_pending_releases = AsyncMock()
    service.enrich_pending_masters = AsyncMock()

    with patched_session(), \
            patch.object(cli, "AlbumEnrichmentRepository"), \
            patch.object(cli, "AlbumEnrichmentService", return_value=service):
        await cli.run(cli.parse_args(["--skip-masters"]))

    service.enrich_pending_releases.assert_awaited_once()
    service.enrich_pending_masters.assert_not_called()
