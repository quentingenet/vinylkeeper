from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.artist_model import Artist
from typing import Optional
from app.core.transaction import TransactionalMixin


class ArtistRepository(TransactionalMixin):
    """Repository for managing artists"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_external_id(self, external_artist_id: str, external_source_id: int) -> Optional[Artist]:
        """Get an artist by external ID and source with relations loaded"""
        query = select(Artist).options(
            selectinload(Artist.external_source)
        ).filter(
            Artist.external_artist_id == external_artist_id,
            Artist.external_source_id == external_source_id
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
