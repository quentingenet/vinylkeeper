from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.discogs_api_usage_model import DiscogsApiUsage


@dataclass
class UsageCounts:
    """Calls counted for one hour and one source, before they are added to the table."""
    calls: int = 0
    rate_limited: int = 0
    min_remaining: Optional[int] = None


class DiscogsUsageRepository:
    """Calls made to the Discogs API, per hour and per source. Callers own the commit."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def add(self, counts: dict[tuple[datetime, str], UsageCounts]) -> None:
        """Adds the counts of a process to the rows of their hours, in a single statement."""
        if not counts:
            return
        statement = insert(DiscogsApiUsage).values([
            {"hour": hour, "source": source, "calls": c.calls, "rate_limited": c.rate_limited,
             "min_remaining": c.min_remaining}
            for (hour, source), c in counts.items()
        ])
        await self.db.execute(statement.on_conflict_do_update(
            index_elements=[DiscogsApiUsage.hour, DiscogsApiUsage.source],
            set_={
                "calls": DiscogsApiUsage.calls + statement.excluded.calls,
                "rate_limited": DiscogsApiUsage.rate_limited + statement.excluded.rate_limited,
                # LEAST leaves a null out: a count without the header keeps the known value
                "min_remaining": func.least(DiscogsApiUsage.min_remaining, statement.excluded.min_remaining),
            },
        ))

    async def since(self, start: datetime) -> list[DiscogsApiUsage]:
        """Rows of the hours from start on, oldest first."""
        query = (select(DiscogsApiUsage).where(DiscogsApiUsage.hour >= start)
                 .order_by(DiscogsApiUsage.hour, DiscogsApiUsage.source))
        return list((await self.db.execute(query)).scalars().all())

    async def delete_before(self, start: datetime) -> int:
        """Removes the rows of the hours before start, returns how many."""
        result = await self.db.execute(delete(DiscogsApiUsage).where(DiscogsApiUsage.hour < start))
        return result.rowcount or 0
