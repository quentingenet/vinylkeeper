"""
Backfill Discogs metadata on albums. Resumable and idempotent: only albums that
are not enriched yet are fetched, so it can be interrupted and run again.

Usage (from vinylkeeper_back/):
    poetry run python -m app.cli.enrich_albums [--limit N] [--dry-run] [--skip-masters]

    --limit N       fetch at most N releases (and N masters)
    --dry-run       only count what is pending, no Discogs call, no write
    --skip-masters  fetch releases only (original years can be fetched later)
"""
import argparse
import asyncio

import httpx

from app.core.logging import logger
from app.db.session import AsyncSessionLocal, engine
from app.repositories.album_enrichment_repository import AlbumEnrichmentRepository
from app.services.album_enrichment_service import (
    DISCOGS_MIN_INTERVAL_SECONDS,
    AlbumEnrichmentService,
    DiscogsClient,
    EnrichmentReport,
)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Backfill Discogs metadata on albums.")
    parser.add_argument("--limit", type=int, default=None, help="Maximum number of releases/masters to fetch")
    parser.add_argument("--dry-run", action="store_true", help="Only count pending albums")
    parser.add_argument("--skip-masters", action="store_true", help="Do not fetch original years")
    return parser.parse_args(argv)


async def run(args: argparse.Namespace) -> EnrichmentReport:
    report = EnrichmentReport()
    async with AsyncSessionLocal() as db:
        repository = AlbumEnrichmentRepository(db)
        if args.dry_run:
            releases = await repository.list_pending_releases(args.limit)
            masters = await repository.list_pending_masters(args.limit)
            minutes = (len(releases) + len(masters)) * DISCOGS_MIN_INTERVAL_SECONDS / 60
            print(f"Pending: {len(releases)} release(s), {len(masters)} master(s) "
                  f"(~{minutes:.0f} min; masters of pending releases are not counted yet)")
            return report

        async with httpx.AsyncClient(timeout=httpx.Timeout(20.0, connect=10.0)) as http_client:
            service = AlbumEnrichmentService(repository, DiscogsClient(http_client))
            await service.enrich_pending_releases(args.limit, report=report)
            if not args.skip_masters:
                await service.enrich_pending_masters(args.limit, report=report)

    print(
        f"Done: {report.enriched} enriched, {report.not_found} not found on Discogs, "
        f"{report.masters_done} master(s) resolved ({report.master_rows_updated} album rows), "
        f"{len(report.failed)} skipped (retry by running the command again)"
    )
    if report.failed:
        logger.warning(f"Album enrichment skipped: {', '.join(report.failed[:50])}")
    return report


def main(argv: list[str] | None = None) -> None:
    async def _main() -> None:
        try:
            await run(parse_args(argv))
        finally:
            await engine.dispose()

    asyncio.run(_main())


if __name__ == "__main__":
    main()
