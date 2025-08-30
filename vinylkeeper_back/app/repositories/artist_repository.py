from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.artist_model import Artist
from typing import Optional, List
from app.core.exceptions import ServerError
from app.core.logging import logger


class ArtistRepository:
    """Repository for managing artists"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, artist_id: int) -> Optional[Artist]:
        """Get an artist by ID"""
        try:
            query = select(Artist).filter(Artist.id == artist_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error retrieving artist {artist_id}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get artist by id",
                details={"error": str(e)}
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
        except Exception as e:
            logger.error(f"Error retrieving artist by external ID {external_artist_id} from source {external_source_id}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get artist by external id",
                details={"error": str(e)}
            )

    async def create(self, artist: Artist) -> Artist:
        """Create a new artist"""
        try:
            self.db.add(artist)
            await self.db.commit()
            await self.db.refresh(artist)
            return artist
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating artist: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to create artist",
                details={"error": str(e)}
            )

    async def update(self, artist: Artist) -> Artist:
        """Update an artist"""
        try:
            self.db.add(artist)
            await self.db.commit()
            await self.db.refresh(artist)
            return artist
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating artist {artist.id}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to update artist",
                details={"error": str(e)}
            )

    async def delete(self, artist: Artist) -> bool:
        """Delete an artist"""
        try:
            await self.db.delete(artist)
            await self.db.commit()
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting artist {artist.id}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to delete artist",
                details={"error": str(e)}
            )

    async def get_all(self) -> List[Artist]:
        """Get all artists"""
        try:
            query = select(Artist)
            result = await self.db.execute(query)
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error retrieving all artists: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get all artists",
                details={"error": str(e)}
            )

    async def search_by_title(self, title: str) -> List[Artist]:
        """Search artists by title"""
        try:
            query = select(Artist).filter(Artist.title.ilike(f"%{title}%"))
            result = await self.db.execute(query)
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error searching artists by title '{title}': {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to search artists by title",
                details={"error": str(e)}
            )
