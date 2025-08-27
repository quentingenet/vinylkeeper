from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.album_model import Album
from typing import Optional, List
from app.core.exceptions import ServerError


class AlbumRepository:
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
            raise ServerError(
                error_code=5000,
                message="Failed to get album by external id",
                details={"error": str(e)}
            )

    async def create(self, album: Album) -> Album:
        """Create a new album"""
        try:
            self.db.add(album)
            await self.db.commit()
            await self.db.refresh(album)
            return album
        except Exception as e:
            await self.db.rollback()
            raise ServerError(
                error_code=5000,
                message="Failed to create album",
                details={"error": str(e)}
            )

    async def update(self, album: Album) -> Album:
        """Update an album"""
        try:
            self.db.add(album)
            await self.db.commit()
            await self.db.refresh(album)
            return album
        except Exception as e:
            await self.db.rollback()
            raise ServerError(
                error_code=5000,
                message="Failed to update album",
                details={"error": str(e)}
            )

    async def delete(self, album: Album) -> bool:
        """Delete an album"""
        try:
            await self.db.delete(album)
            await self.db.commit()
            return True
        except Exception as e:
            await self.db.rollback()
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
