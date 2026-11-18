from datetime import date, datetime, timedelta
from typing import Optional

from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.album_model import Album
from app.models.album_price_model import AlbumPrice, AlbumPriceRequest, ExchangeRate, ValueRefresh


class AlbumPriceRepository:
    """Discogs prices of the releases kept in collections, and exchange rates. Callers own the commit."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def save_prices(self, album_id: int, values: dict) -> None:
        statement = insert(AlbumPrice).values(album_id=album_id, fetched_at=func.now(), **values)
        await self.db.execute(statement.on_conflict_do_update(
            index_elements=[AlbumPrice.album_id],
            set_={**values, "fetched_at": func.now()},
        ))

    async def save_rate(self, currency: str, rate: float, rate_date: date) -> None:
        statement = insert(ExchangeRate).values(currency=currency, rate=rate, rate_date=rate_date)
        await self.db.execute(statement.on_conflict_do_update(
            index_elements=[ExchangeRate.currency],
            set_={"rate": rate, "rate_date": rate_date, "updated_at": func.now()},
        ))

    async def get_rate(self, currency: str) -> Optional[ExchangeRate]:
        return (await self.db.execute(
            select(ExchangeRate).where(ExchangeRate.currency == currency)
        )).scalar_one_or_none()

    async def request_refresh(self, album_ids: list[int]) -> int:
        """Queue releases to re-evaluate; one already queued keeps its place. Returns how many were added."""
        if not album_ids:
            return 0
        result = await self.db.execute(
            insert(AlbumPriceRequest).values([{"album_id": album_id} for album_id in album_ids])
            .on_conflict_do_nothing(index_elements=[AlbumPriceRequest.album_id])
            .returning(AlbumPriceRequest.album_id)
        )
        return len(result.all())

    async def next_requests(self, limit: int) -> list[tuple[int, str]]:
        """Queued releases, first asked first served."""
        query = (
            select(AlbumPriceRequest.album_id, Album.external_album_id)
            .join(Album, Album.id == AlbumPriceRequest.album_id)
            .order_by(AlbumPriceRequest.requested_at, AlbumPriceRequest.album_id)
            .limit(limit)
        )
        return [(row.album_id, row.external_album_id) for row in (await self.db.execute(query)).all()]

    async def count_requests(self) -> int:
        """Releases waiting in the re-evaluation queue."""
        return (await self.db.execute(select(func.count()).select_from(AlbumPriceRequest))).scalar_one()

    async def delete_request(self, album_id: int) -> None:
        await self.db.execute(delete(AlbumPriceRequest).where(AlbumPriceRequest.album_id == album_id))

    async def recent_refreshes(self, user_id: int, window: timedelta) -> list[datetime]:
        """When the user re-evaluated a collection within the window, oldest first."""
        query = (
            select(ValueRefresh.created_at)
            .where(ValueRefresh.user_id == user_id, ValueRefresh.created_at > func.now() - window)
            .order_by(ValueRefresh.created_at)
        )
        return list((await self.db.execute(query)).scalars().all())

    async def record_refresh(self, user_id: int) -> None:
        self.db.add(ValueRefresh(user_id=user_id))
        await self.db.flush()
