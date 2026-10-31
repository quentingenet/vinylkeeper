"""
Backfill Discogs metadata on albums. Resumable and idempotent: only albums that
are not enriched yet are fetched, so it can be interrupted and run again.
Albums enriched by a run also get their rule-based moods. Then the Discogs suggested prices
of the releases kept in collections (missing ones, then those older than 30 days) and the
day's EUR exchange rates are refreshed.

Usage (from vinylkeeper_back/):
    poetry run python -m app.cli.enrich_albums [--limit N] [--dry-run] [--skip-masters] [--skip-editions]
                                               [--refresh-titles] [--refresh-editions-before YYYY-MM-DD]
                                               [--skip-prices]

    --limit N         fetch at most N releases (and N masters, N pressings)
    --dry-run         only count what is pending, no Discogs call, no write
    --skip-masters    fetch releases only (original years can be fetched later)
    --skip-editions   do not catch up pressing details of albums enriched before they were stored
    --refresh-titles  also rewrite the title, cover and artists of albums enriched before
                      they followed Discogs ('Hirt* - ...' -> 'Al Hirt - ...'), one call each
    --refresh-editions-before YYYY-MM-DD
                      also fetch again the pressing details stored before that day (UTC), to get
                      the full format ('180 Gram', colours, '2 × Vinyl'), one call each; resumable
    --skip-prices     do not refresh prices and exchange rates
"""
import argparse
import asyncio
from datetime import datetime, timezone

import httpx

from app.core.logging import logger
from app.db.session import AsyncSessionLocal, engine
from app.repositories.album_enrichment_repository import AlbumEnrichmentRepository
from app.repositories.album_price_repository import AlbumPriceRepository
from app.repositories.mood_assignment_repository import MoodAssignmentRepository
from app.services.album_enrichment_service import (
    DISCOGS_MIN_INTERVAL_SECONDS,
    AlbumEnrichmentService,
    DiscogsClient,
    EnrichmentReport,
)
from app.services.album_price_service import AlbumPriceService, refresh_exchange_rates
from app.services.mood_assignment_service import MoodAssignmentService


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Backfill Discogs metadata on albums.")
    parser.add_argument("--limit", type=int, default=None, help="Maximum number of releases/masters to fetch")
    parser.add_argument("--dry-run", action="store_true", help="Only count pending albums")
    parser.add_argument("--skip-masters", action="store_true", help="Do not fetch original years")
    parser.add_argument("--skip-editions", action="store_true",
                        help="Do not catch up pressing details of albums enriched before they were stored")
    parser.add_argument("--refresh-titles", action="store_true",
                        help="Rewrite titles of albums enriched before they followed Discogs")
    parser.add_argument("--refresh-editions-before", type=_utc_day, default=None, metavar="YYYY-MM-DD",
                        help="Fetch again the pressing details stored before that day (UTC)")
    parser.add_argument("--skip-prices", action="store_true", help="Do not refresh prices and exchange rates")
    return parser.parse_args(argv)


def _utc_day(value: str) -> datetime:
    return datetime.strptime(value, "%Y-%m-%d").replace(tzinfo=timezone.utc)


async def run(args: argparse.Namespace) -> EnrichmentReport:
    report = EnrichmentReport()
    async with AsyncSessionLocal() as db:
        repository = AlbumEnrichmentRepository(db)
        if args.dry_run:
            releases = await repository.list_pending_releases(args.limit)
            masters = await repository.list_pending_masters(args.limit)
            editions = await repository.list_pending_editions(args.limit)
            titles = await repository.list_stale_titles(args.limit) if args.refresh_titles else []
            if args.refresh_editions_before:
                editions += await repository.list_stale_editions(args.refresh_editions_before, args.limit)
            prices = [] if args.skip_prices else await AlbumPriceRepository(db).list_pending_prices(args.limit)
            calls = len(releases) + len(masters) + len(editions) + len(titles) + len(prices)
            minutes = calls * DISCOGS_MIN_INTERVAL_SECONDS / 60
            print(f"Pending: {len(releases)} release(s), {len(masters)} master(s), {len(editions)} pressing(s), "
                  f"{len(titles)} title(s), {len(prices)} price(s) "
                  f"(~{minutes:.0f} min; masters of pending releases are not counted yet)")
            return report

        async with httpx.AsyncClient(timeout=httpx.Timeout(20.0, connect=10.0)) as http_client:
            service = AlbumEnrichmentService(repository, DiscogsClient(http_client))
            await service.enrich_pending_releases(args.limit, report=report)
            # Styles are known now: moods do not wait for the (longer) masters pass
            if report.enriched_album_ids:
                moods = await MoodAssignmentService(MoodAssignmentRepository(db)).assign(report.enriched_album_ids)
                await db.commit()
                print(f"Moods: {moods.with_moods} album(s) with moods, {moods.without_moods} without")
            if not args.skip_masters:
                await service.enrich_pending_masters(args.limit, report=report)
            if not args.skip_editions:
                await service.enrich_pending_editions(args.limit, report=report)
            if args.refresh_titles:
                await service.refresh_stale_titles(args.limit, report=report)
            if args.refresh_editions_before:
                await service.refresh_stale_editions(args.refresh_editions_before, args.limit, report=report)
            if not args.skip_prices:
                price_repository = AlbumPriceRepository(db)
                await refresh_exchange_rates(price_repository, http_client)
                price_service = AlbumPriceService(price_repository, service.client)
                # Re-evaluations asked from the dashboard and left by a stopped worker first
                await price_service.work_requests(report=report)
                await price_service.refresh_prices(args.limit, report=report)

    print(
        f"Done: {report.enriched} enriched, {report.not_found} not found on Discogs, "
        f"{report.masters_done} master(s) resolved ({report.master_rows_updated} album rows), "
        f"{report.editions_done} pressing(s) caught up, {report.titles_refreshed} title(s) refreshed, "
        f"{report.prices_done} price(s) ({report.prices_missing} without price), "
        f"{len(report.failed)} skipped (retry by running the command again)"
    )
    if report.prices_blocked:
        print("Prices stopped: Discogs refuses them (seller settings of the token account, in EUR)")
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
