from typing import Optional, cast

from sqlalchemy import func, select, update
from sqlalchemy.engine import CursorResult
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import ExternalSourceEnum
from app.models.album_model import Album
from app.models.reference_data.external_sources import ExternalSource


class AlbumEnrichmentRepository:
    """Queries for the Discogs enrichment of albums. Callers own the commit."""

    def __init__(self, db: AsyncSession):
        self.db = db

    def _discogs_albums(self):
        return (
            select(Album.id, Album.external_album_id)
            .join(ExternalSource, ExternalSource.id == Album.external_source_id)
            .filter(ExternalSource.name == ExternalSourceEnum.DISCOGS.value)
        )

    async def list_pending_releases(self, limit: Optional[int] = None) -> list[tuple[int, str]]:
        query = self._discogs_albums().filter(Album.enriched_at.is_(None)).order_by(Album.id)
        if limit:
            query = query.limit(limit)
        return [(row.id, row.external_album_id) for row in (await self.db.execute(query)).all()]

    async def get_pending_release_by_external_id(self, external_album_id: str) -> Optional[int]:
        query = self._discogs_albums().filter(
            Album.external_album_id == external_album_id,
            Album.enriched_at.is_(None),
        )
        row = (await self.db.execute(query)).first()
        return row.id if row else None

    async def get_pending_master(self, album_id: int) -> Optional[str]:
        query = select(Album.external_master_id).filter(
            Album.id == album_id, Album.enrichment_status == "pending_master")
        return (await self.db.execute(query)).scalar_one_or_none()

    async def list_pending_masters(self, limit: Optional[int] = None) -> list[str]:
        query = (
            select(Album.external_master_id)
            .filter(Album.enrichment_status == "pending_master", Album.external_master_id.is_not(None))
            .group_by(Album.external_master_id)
            .order_by(Album.external_master_id)
        )
        if limit:
            query = query.limit(limit)
        return list((await self.db.execute(query)).scalars().all())

    async def find_known_original_year(self, external_master_id: str) -> Optional[int]:
        """Original year already fetched for another pressing of the same master."""
        query = select(Album.original_year).filter(
            Album.external_master_id == external_master_id,
            Album.enrichment_status == "ok",
            Album.original_year.is_not(None),
        ).limit(1)
        return (await self.db.execute(query)).scalar_one_or_none()

    async def save_release(self, album_id: int, values: dict) -> None:
        await self.db.execute(
            update(Album).where(Album.id == album_id).values(**values, enriched_at=func.now())
        )

    async def list_pending_editions(self, limit: Optional[int] = None) -> list[tuple[int, str]]:
        """Albums enriched before pressing details were stored: formats is NULL until fetched."""
        query = (
            self._discogs_albums()
            .filter(Album.enriched_at.is_not(None), Album.enrichment_status != "not_found",
                    Album.formats.is_(None))
            .order_by(Album.id)
        )
        if limit:
            query = query.limit(limit)
        return [(row.id, row.external_album_id) for row in (await self.db.execute(query)).all()]

    async def save_edition(self, album_id: int, values: dict) -> None:
        """Pressing details only: years, tags and moods of an enriched album are left as they are."""
        await self.db.execute(update(Album).where(Album.id == album_id).values(**values))

    async def mark_release_not_found(self, album_id: int) -> None:
        await self.db.execute(
            update(Album).where(Album.id == album_id)
            .values(enrichment_status="not_found", enriched_at=func.now())
        )

    async def save_master_year(self, external_master_id: str, original_year: Optional[int]) -> int:
        """Close the master step for every pressing of this master. Returns updated rows."""
        result = cast(CursorResult, await self.db.execute(
            update(Album)
            .where(Album.external_master_id == external_master_id,
                   Album.enrichment_status == "pending_master")
            .values(original_year=original_year, enrichment_status="ok")
        ))
        return result.rowcount
