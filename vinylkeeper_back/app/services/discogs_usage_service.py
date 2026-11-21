"""
Calls made to the Discogs API, for the gauge of the admin page.

Each process (gunicorn worker, nightly job) counts its calls in memory, per hour and per source,
and adds them to the table about once a minute with a single upsert, then once more when it stops.
Counting costs a few writes a minute whatever the traffic; a process that crashes loses at most
a minute of counts.
"""
import asyncio
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx

from app.core.logging import logger
from app.db.session import AsyncSessionLocal
from app.repositories.discogs_usage_repository import DiscogsUsageRepository, UsageCounts
from app.schemas.discogs_usage_schema import DiscogsUsageResponse, HourUsage, SourceUsage, UsageTotals


class DiscogsSource:
    """The parts of the app that call Discogs, as stored in discogs_api_usage.source."""
    SEARCH = "search"
    METADATA = "metadata"
    PRICE = "price"
    IMPORT = "import"
    ENRICHMENT = "enrichment"
    OAUTH = "oauth"
    ALL = (SEARCH, METADATA, PRICE, IMPORT, ENRICHMENT, OAUTH)


# Discogs allows 60 authenticated requests a minute
HOURLY_CAPACITY = 60 * 60
FLUSH_INTERVAL_SECONDS = 60
# The nightly job removes the rows older than that
RETENTION = timedelta(days=30)
RATE_LIMIT_HEADER = "X-Discogs-Ratelimit-Remaining"


def _hour_of(moment: datetime) -> datetime:
    return moment.astimezone(timezone.utc).replace(minute=0, second=0, microsecond=0)


class DiscogsUsageRecorder:
    """The counts of this process not written yet."""

    def __init__(self) -> None:
        self._counts: dict[tuple[datetime, str], UsageCounts] = {}

    def record(self, source: str, response: httpx.Response, now: Optional[datetime] = None) -> None:
        """
        One answer of Discogs (a 429 included). A network failure has no answer and is not counted.
        Never raises: counting must not break the request it counts.
        """
        try:
            counts = self._counts.setdefault((_hour_of(now or datetime.now(timezone.utc)), source), UsageCounts())
            counts.calls += 1
            if response.status_code == 429:
                counts.rate_limited += 1
            remaining = response.headers.get(RATE_LIMIT_HEADER)
            if isinstance(remaining, str) and remaining.isdigit():
                value = int(remaining)
                counts.min_remaining = value if counts.min_remaining is None else min(counts.min_remaining, value)
        except Exception as e:
            logger.warning(f"Discogs call not counted: {e}")

    def take(self) -> dict[tuple[datetime, str], UsageCounts]:
        """The counts to write, the recorder starting again from zero."""
        counts, self._counts = self._counts, {}
        return counts

    def give_back(self, counts: dict[tuple[datetime, str], UsageCounts]) -> None:
        """Counts that could not be written: they are added to the next write."""
        for key, unsaved in counts.items():
            current = self._counts.setdefault(key, UsageCounts())
            current.calls += unsaved.calls
            current.rate_limited += unsaved.rate_limited
            if unsaved.min_remaining is not None:
                current.min_remaining = (unsaved.min_remaining if current.min_remaining is None
                                         else min(current.min_remaining, unsaved.min_remaining))

    async def flush(self) -> None:
        """
        Writes the counts. Never raises: the counts stay for the next write when the database fails, and
        when the process stops in the middle of a write (cancelled), so the last flush at shutdown has them.
        """
        counts = self.take()
        if not counts:
            return
        written = False
        try:
            async with AsyncSessionLocal() as db:
                await DiscogsUsageRepository(db).add(counts)
                await db.commit()
                # Committed: given back after this, they would be counted twice
                written = True
        except Exception as e:
            logger.warning(f"Discogs usage not written, kept for the next write: {e}")
        finally:
            if not written:
                self.give_back(counts)

    async def run(self) -> None:
        """Writes the counts once per FLUSH_INTERVAL_SECONDS until cancelled."""
        while True:
            await asyncio.sleep(FLUSH_INTERVAL_SECONDS)
            await self.flush()


# The recorder of this process: every call to Discogs is reported to it
discogs_usage = DiscogsUsageRecorder()


class DiscogsUsageService:
    """What the admin page shows of the calls to Discogs."""

    def __init__(self, repository: DiscogsUsageRepository):
        self.repository = repository

    async def usage(self, now: Optional[datetime] = None) -> DiscogsUsageResponse:
        current_hour = _hour_of(now or datetime.now(timezone.utc))
        first_hour = current_hour - timedelta(hours=23)
        rows = await self.repository.since(first_hour)

        hours = {first_hour + timedelta(hours=i): HourUsage(hour=first_hour + timedelta(hours=i), calls=0,
                                                            rate_limited=0) for i in range(24)}
        sources = {source: SourceUsage(source=source, calls_current_hour=0, calls_last_24_hours=0,
                                       rate_limited_last_24_hours=0) for source in DiscogsSource.ALL}
        lowest: Optional[int] = None
        for row in rows:
            hour = hours.get(_hour_of(row.hour))
            if hour is None:
                continue  # A clock ahead of this one: not shown
            hour.calls += row.calls
            hour.rate_limited += row.rate_limited
            source = sources.setdefault(row.source, SourceUsage(
                source=row.source, calls_current_hour=0, calls_last_24_hours=0, rate_limited_last_24_hours=0))
            source.calls_last_24_hours += row.calls
            source.rate_limited_last_24_hours += row.rate_limited
            if hour.hour == current_hour:
                source.calls_current_hour += row.calls
            if row.min_remaining is not None:
                lowest = row.min_remaining if lowest is None else min(lowest, row.min_remaining)

        now_hour = hours[current_hour]
        return DiscogsUsageResponse(
            current_hour=UsageTotals(calls=now_hour.calls, rate_limited=now_hour.rate_limited,
                                     capacity=HOURLY_CAPACITY),
            last_24_hours=UsageTotals(calls=sum(h.calls for h in hours.values()),
                                      rate_limited=sum(h.rate_limited for h in hours.values()),
                                      capacity=HOURLY_CAPACITY * 24),
            by_source=sorted(sources.values(), key=lambda s: (-s.calls_last_24_hours, s.source)),
            hours=list(hours.values()),
            lowest_remaining=lowest,
            delay_seconds=FLUSH_INTERVAL_SECONDS,
        )

    async def purge(self, now: Optional[datetime] = None) -> int:
        """Removes the hours older than RETENTION. The caller commits."""
        return await self.repository.delete_before(_hour_of(now or datetime.now(timezone.utc)) - RETENTION)
