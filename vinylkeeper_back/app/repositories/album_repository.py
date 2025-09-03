from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.album_model import Album
from typing import Optional, List
from app.core.exceptions import ServerError
from app.core.logging import logger
from app.core.transaction import TransactionalMixin


class AlbumRepository(TransactionalMixin):
    """Repository for managing albums"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, album_id: int) -> Optional[Album]:
        """Get an album by ID"""
        try:
            query = select(Album).filter(Album.id == album_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error retrieving album {album_id}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get album by id",
                details={"error": str(e)}
            )

    async def get_by_external_id(self, external_album_id: str, external_source_id: int) -> Optional[Album]:
        """Get an album by external ID and source with relations loaded"""
        try:
            query = select(Album).options(
                selectinload(Album.external_source)
            ).filter(
                Album.external_album_id == external_album_id,
                Album.external_source_id == external_source_id
            )
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error retrieving album by external ID {external_album_id} from source {external_source_id}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get album by external id",
                details={"error": str(e)}
            )

    async def create(self, album: Album) -> Album:
        """Create a new album without committing (transaction managed by service)."""
        try:
            await self._add_entity(album, flush=True)  # Flush to get the ID
            await self._refresh_entity(album)
            return album
        except Exception as e:
            logger.error(f"Error creating album: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to create album",
                details={"error": str(e)}
            )

    async def update(self, album: Album) -> Album:
        """Update an album without committing (transaction managed by service)."""
        try:
            await self._add_entity(album, flush=True)  # Flush to ensure changes are persisted
            await self._refresh_entity(album)
            return album
        except Exception as e:
            logger.error(f"Error updating album {album.id}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to update album",
                details={"error": str(e)}
            )

    async def delete(self, album: Album) -> bool:
        """Delete an album without committing (transaction managed by service)."""
        try:
            await self._delete_entity(album)
            return True
        except Exception as e:
            logger.error(f"Error deleting album {album.id}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to delete album",
                details={"error": str(e)}
            )

    async def get_all(self) -> List[Album]:
        """Get all albums"""
        try:
            query = select(Album)
            result = await self.db.execute(query)
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error retrieving all albums: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get all albums",
                details={"error": str(e)}
            )

    async def search_by_title(self, title: str) -> List[Album]:
        """Search albums by title"""
        try:
            query = select(Album).filter(Album.title.ilike(f"%{title}%"))
            result = await self.db.execute(query)
            return result.scalars().all()
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to search albums by title",
                details={"error": str(e)}
            )
