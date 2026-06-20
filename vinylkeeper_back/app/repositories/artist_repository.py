from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import SQLAlchemyError
from app.models.artist_model import Artist
from typing import Optional
from app.core.exceptions import ServerError
from app.core.logging import logger
from app.core.transaction import TransactionalMixin


class ArtistRepository(TransactionalMixin):
    """Repository for managing artists"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, artist_id: int) -> Optional[Artist]:
        """Get an artist by ID"""
        try:
            query = select(Artist).filter(Artist.id == artist_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except SQLAlchemyError as e:
            logger.error(f"Error retrieving artist {artist_id}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get artist by id",
                details={}
            )

    async def get_by_external_id(self, external_artist_id: str, external_source_id: int) -> Optional[Artist]:
        """Get an artist by external ID and source with relations loaded"""
        try:
            query = select(Artist).options(
                selectinload(Artist.external_source)
            ).filter(
                Artist.external_artist_id == external_artist_id,
                Artist.external_source_id == external_source_id
            )
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except SQLAlchemyError as e:
            logger.error(
                f"Error retrieving artist by external ID {external_artist_id}"
                f" from source {external_source_id}: {str(e)}"
            )
            raise ServerError(
                error_code=5000,
                message="Failed to get artist by external id",
                details={}
            )

    async def create(self, artist: Artist) -> Artist:
        """Create a new artist without committing (transaction managed by service)."""
        try:
            await self._add_entity(artist, flush=True)  # Flush to get the ID
            await self._refresh_entity(artist)
            return artist
        except SQLAlchemyError as e:
            logger.error(f"Error creating artist: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to create artist",
                details={}
            )

    async def update(self, artist: Artist) -> Artist:
        """Update an artist without committing (transaction managed by service)."""
        try:
            await self._add_entity(artist, flush=True)  # Flush to ensure changes are persisted
            await self._refresh_entity(artist)
            return artist
        except SQLAlchemyError as e:
            logger.error(f"Error updating artist {artist.id}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to update artist",
                details={}
            )

    async def delete(self, artist: Artist) -> bool:
        """Delete an artist without committing (transaction managed by service)."""
        try:
            await self._delete_entity(artist)
            return True
        except SQLAlchemyError as e:
            logger.error(f"Error deleting artist {artist.id}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to delete artist",
                details={}
            )
