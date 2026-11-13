from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.album_model import Album
from typing import Optional
from app.core.transaction import TransactionalMixin


class AlbumRepository(TransactionalMixin):
    """Repository for managing albums"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_external_id(self, external_album_id: str, external_source_id: int) -> Optional[Album]:
        """Get an album by external ID and source with relations loaded"""
        query = select(Album).options(
            selectinload(Album.external_source)
        ).filter(
            Album.external_album_id == external_album_id,
            Album.external_source_id == external_source_id
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
