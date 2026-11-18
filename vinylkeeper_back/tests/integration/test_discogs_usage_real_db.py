"""Discogs usage rows on a real PostgreSQL: the upsert adds the counts of every process (SAVEPOINT, nothing kept)."""
from datetime import datetime, timedelta, timezone

from app.repositories.discogs_usage_repository import DiscogsUsageRepository, UsageCounts

# Far in the future: no row of the copied database can be mixed with these ones
HOUR = datetime(2099, 1, 1, 12, tzinfo=timezone.utc)


async def test_counts_of_several_processes_add_up_and_keep_the_lowest_remaining(real_session):
    repository = DiscogsUsageRepository(real_session)

    await repository.add({(HOUR, "search"): UsageCounts(calls=3, rate_limited=1, min_remaining=20)})
    await repository.add({(HOUR, "search"): UsageCounts(calls=2, rate_limited=0, min_remaining=None),
                          (HOUR, "price"): UsageCounts(calls=5, min_remaining=40)})
    await repository.add({(HOUR, "search"): UsageCounts(calls=1, min_remaining=7)})

    rows = {row.source: row for row in await repository.since(HOUR)}
    assert (rows["search"].calls, rows["search"].rate_limited, rows["search"].min_remaining) == (6, 1, 7)
    assert (rows["price"].calls, rows["price"].min_remaining) == (5, 40)


async def test_old_hours_are_removed_and_recent_ones_kept(real_session):
    repository = DiscogsUsageRepository(real_session)
    await repository.add({(HOUR - timedelta(days=40), "import"): UsageCounts(calls=1),
                          (HOUR, "import"): UsageCounts(calls=2)})

    removed = await repository.delete_before(HOUR - timedelta(days=30))

    assert removed >= 1
    assert [(row.hour, row.calls) for row in await repository.since(HOUR - timedelta(days=41))
            if row.source == "import" and row.hour >= HOUR - timedelta(days=41)] == [(HOUR, 2)]
