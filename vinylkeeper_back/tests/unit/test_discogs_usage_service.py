"""Counting of the calls made to Discogs and the gauge built from the counts (no database, no network)."""
import asyncio
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

import app.services.discogs_usage_service as module
from app.repositories.discogs_usage_repository import UsageCounts
from app.services.discogs_usage_service import (
    HOURLY_CAPACITY,
    DiscogsSource,
    DiscogsUsageRecorder,
    DiscogsUsageService,
)

NOW = datetime(2026, 11, 18, 15, 42, tzinfo=timezone.utc)
HOUR = datetime(2026, 11, 18, 15, tzinfo=timezone.utc)


def answer(status: int = 200, remaining: str | None = None) -> httpx.Response:
    headers = {} if remaining is None else {"X-Discogs-Ratelimit-Remaining": remaining}
    return httpx.Response(status, headers=headers)


class TestRecorder:
    def test_counts_calls_and_429_per_hour_and_source_with_the_lowest_remaining(self):
        recorder = DiscogsUsageRecorder()
        recorder.record(DiscogsSource.SEARCH, answer(remaining="40"), now=NOW)
        recorder.record(DiscogsSource.SEARCH, answer(429, remaining="0"), now=NOW)
        recorder.record(DiscogsSource.SEARCH, answer(), now=NOW)
        recorder.record(DiscogsSource.PRICE, answer(remaining="55"), now=NOW + timedelta(hours=1))

        counts = recorder.take()

        assert counts[(HOUR, "search")] == UsageCounts(calls=3, rate_limited=1, min_remaining=0)
        assert counts[(HOUR + timedelta(hours=1), "price")] == UsageCounts(calls=1, rate_limited=0, min_remaining=55)
        assert recorder.take() == {}  # Taken once only

    def test_a_strange_answer_never_breaks_the_request_it_counts(self):
        recorder = DiscogsUsageRecorder()
        recorder.record(DiscogsSource.METADATA, MagicMock(), now=NOW)  # A mocked client in a test, for instance
        recorder.record(DiscogsSource.METADATA, None, now=NOW)

        assert recorder.take()[(HOUR, "metadata")].calls >= 1

    def test_counts_that_could_not_be_written_are_added_to_the_next_ones(self):
        recorder = DiscogsUsageRecorder()
        recorder.record(DiscogsSource.IMPORT, answer(remaining="10"), now=NOW)

        recorder.give_back({(HOUR, "import"): UsageCounts(calls=4, rate_limited=2, min_remaining=3)})

        assert recorder.take()[(HOUR, "import")] == UsageCounts(calls=5, rate_limited=2, min_remaining=3)

    async def test_flush_writes_once_and_commits(self):
        recorder = DiscogsUsageRecorder()
        recorder.record(DiscogsSource.OAUTH, answer(), now=NOW)
        session = AsyncMock()
        session.__aenter__.return_value = session
        repository = MagicMock(add=AsyncMock())

        with patch.object(module, "AsyncSessionLocal", return_value=session), \
                patch.object(module, "DiscogsUsageRepository", return_value=repository):
            await recorder.flush()
            await recorder.flush()  # Nothing new: no write

        repository.add.assert_awaited_once_with({(HOUR, "oauth"): UsageCounts(calls=1)})
        session.commit.assert_awaited_once()

    async def test_a_failed_write_keeps_the_counts(self):
        recorder = DiscogsUsageRecorder()
        recorder.record(DiscogsSource.OAUTH, answer(), now=NOW)

        with patch.object(module, "AsyncSessionLocal", side_effect=OSError("database down")):
            await recorder.flush()

        assert recorder.take() == {(HOUR, "oauth"): UsageCounts(calls=1)}

    async def test_a_write_cancelled_at_shutdown_keeps_the_counts(self):
        """The writer is cancelled at shutdown, maybe mid-write: the last flush must still have the counts."""
        recorder = DiscogsUsageRecorder()
        recorder.record(DiscogsSource.OAUTH, answer(), now=NOW)
        session = AsyncMock()
        session.__aenter__.return_value = session
        repository = MagicMock(add=AsyncMock(side_effect=asyncio.CancelledError()))

        with patch.object(module, "AsyncSessionLocal", return_value=session), \
                patch.object(module, "DiscogsUsageRepository", return_value=repository):
            with pytest.raises(asyncio.CancelledError):
                await recorder.flush()

        assert recorder.take() == {(HOUR, "oauth"): UsageCounts(calls=1)}

    async def test_counts_committed_are_not_given_back(self):
        """Cancelled once the commit is done (closing the session): given back, they would count twice."""
        recorder = DiscogsUsageRecorder()
        recorder.record(DiscogsSource.OAUTH, answer(), now=NOW)
        session = AsyncMock()
        session.__aenter__.return_value = session
        session.__aexit__.side_effect = asyncio.CancelledError()
        repository = MagicMock(add=AsyncMock())

        with patch.object(module, "AsyncSessionLocal", return_value=session), \
                patch.object(module, "DiscogsUsageRepository", return_value=repository):
            with pytest.raises(asyncio.CancelledError):
                await recorder.flush()

        assert recorder.take() == {}


def row(hour: datetime, source: str, calls: int, rate_limited: int = 0, min_remaining: int | None = None):
    return SimpleNamespace(hour=hour, source=source, calls=calls, rate_limited=rate_limited,
                           min_remaining=min_remaining)


class TestGauge:
    async def test_current_hour_last_24_hours_and_sources(self):
        repository = MagicMock(since=AsyncMock(return_value=[
            row(HOUR - timedelta(hours=23), "enrichment", 900, min_remaining=12),
            row(HOUR - timedelta(hours=2), "search", 100, rate_limited=3, min_remaining=0),
            row(HOUR, "search", 40),
            row(HOUR, "price", 25, min_remaining=30),
        ]))

        usage = await DiscogsUsageService(repository).usage(now=NOW)

        repository.since.assert_awaited_once_with(HOUR - timedelta(hours=23))
        assert (usage.current_hour.calls, usage.current_hour.capacity) == (65, HOURLY_CAPACITY)
        assert (usage.last_24_hours.calls, usage.last_24_hours.rate_limited) == (1065, 3)
        assert usage.last_24_hours.capacity == HOURLY_CAPACITY * 24
        assert usage.lowest_remaining == 0
        # Every hour is there, the empty ones too, the current one last
        assert len(usage.hours) == 24 and usage.hours[-1].hour == HOUR and usage.hours[-1].calls == 65
        assert usage.hours[0].calls == 900 and usage.hours[1].calls == 0
        # Every source is there, the busiest first
        assert [s.source for s in usage.by_source][:3] == ["enrichment", "search", "price"]
        search = next(s for s in usage.by_source if s.source == "search")
        assert (search.calls_current_hour, search.calls_last_24_hours,
                search.rate_limited_last_24_hours) == (40, 140, 3)
        assert {s.source for s in usage.by_source} == set(DiscogsSource.ALL)

    async def test_nothing_counted_yet(self):
        usage = await DiscogsUsageService(MagicMock(since=AsyncMock(return_value=[]))).usage(now=NOW)

        assert usage.current_hour.calls == 0 and usage.last_24_hours.calls == 0
        assert usage.lowest_remaining is None

    async def test_purge_keeps_a_month(self):
        repository = MagicMock(delete_before=AsyncMock(return_value=7))

        assert await DiscogsUsageService(repository).purge(now=NOW) == 7
        repository.delete_before.assert_awaited_once_with(HOUR - timedelta(days=30))
