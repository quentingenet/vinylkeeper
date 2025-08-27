from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.collection_album import CollectionAlbum
from app.models.album_model import Album
from app.models.reference_data.vinyl_state import VinylState
from app.utils.vinyl_state_mapping import VinylStateMapping
from app.core.exceptions import (
    ResourceNotFoundError,
    ServerError,
    DuplicateFieldError
)
from app.core.logging import logger


class CollectionAlbumRepository:
    """Repository for managing collection-album associations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, collection_album: CollectionAlbum) -> CollectionAlbum:
        """Create a new collection-album association"""
        try:
            self.db.add(collection_album)
            await self.db.commit()
            await self.db.refresh(collection_album)
            return collection_album
        except Exception as e:
            await self.db.rollback()
            logger.error(
                f"Error creating collection-album association: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to create collection-album association",
                details={"error": str(e)}
            )

    async def update(self, collection_album: CollectionAlbum) -> CollectionAlbum:
        """Update a collection-album association"""
        try:
            self.db.add(collection_album)
            await self.db.commit()
            await self.db.refresh(collection_album)
            return collection_album
        except Exception as e:
            await self.db.rollback()
            logger.error(
                f"Error updating collection-album association: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to update collection-album association",
                details={"error": str(e)}
            )

    async def delete(self, collection_album: CollectionAlbum) -> bool:
        """Delete a collection-album association"""
        try:
            await self.db.delete(collection_album)
            await self.db.commit()
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(
                f"Error deleting collection-album association: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to delete collection-album association",
                details={"error": str(e)}
            )

    async def find_by_collection_and_album(self, collection_id: int, album_id: int) -> Optional[CollectionAlbum]:
        """Find a collection-album association by collection and album IDs"""
        try:
            query = select(CollectionAlbum).filter(
                CollectionAlbum.collection_id == collection_id,
                CollectionAlbum.album_id == album_id
            )
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(
                f"Error finding collection-album association: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to find collection-album association",
                details={"error": str(e)}
            )

    async def find_by_collection(self, collection_id: int) -> List[CollectionAlbum]:
        """Find all album associations for a collection"""
        try:
            query = select(CollectionAlbum).filter(
                CollectionAlbum.collection_id == collection_id
            )
            result = await self.db.execute(query)
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error finding collection albums: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to find collection albums",
                details={"error": str(e)}
            )

    async def find_by_album(self, album_id: int) -> List[CollectionAlbum]:
        """Find all collection associations for an album"""
        try:
            query = select(CollectionAlbum).filter(
                CollectionAlbum.album_id == album_id
            )
            result = await self.db.execute(query)
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error finding album collections: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to find album collections",
                details={"error": str(e)}
            )

    async def get_vinyl_state_id(self, state_name: str) -> Optional[int]:
        """Get vinyl state ID by name using mapping"""
        return VinylStateMapping.get_id_from_name(state_name)

    async def get_vinyl_state_name(self, state_id: int) -> Optional[str]:
        """Get vinyl state name by ID using mapping"""
        return VinylStateMapping.get_name_from_id(state_id)

    async def get_collection_albums_paginated(self, collection_id: int, page: int = 1, limit: int = 12) -> tuple[List[tuple], int]:
        """Get paginated albums for a collection with metadata"""
        try:
            from sqlalchemy import func
            
            # Calculate offset
            offset = (page - 1) * limit
            
            # Query to get albums with collection metadata
            query = (
                select(Album, CollectionAlbum)
                .join(CollectionAlbum, Album.id == CollectionAlbum.album_id)
                .options(
                    selectinload(CollectionAlbum.state_record_ref),
                    selectinload(CollectionAlbum.state_cover_ref)
                )
                .filter(CollectionAlbum.collection_id == collection_id)
                .offset(offset)
                .limit(limit)
            )
            
            result = await self.db.execute(query)
            albums_with_metadata = result.all()
            
            # Get total count
            count_query = select(func.count(CollectionAlbum.album_id)).filter(
                CollectionAlbum.collection_id == collection_id
            )
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()
            
            return albums_with_metadata, total
            
        except Exception as e:
            logger.error(f"Error getting collection albums paginated: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get collection albums paginated",
                details={"error": str(e)}
            )

    async def get_album_with_metadata(self, collection_id: int, album_id: int) -> Optional[Album]:
        """Get an album with its collection metadata"""
        try:
            query = select(Album).join(
                CollectionAlbum, Album.id == CollectionAlbum.album_id
            ).filter(
                CollectionAlbum.collection_id == collection_id,
                Album.id == album_id
            )
            
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
            
        except Exception as e:
            logger.error(f"Error getting album with metadata: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get album with metadata",
                details={"error": str(e)}
            )

    async def add_album_to_collection(self, collection_id: int, album_id: int, metadata: dict) -> CollectionAlbum:
        """Add an album to a collection with metadata"""
        try:
            # Check if association already exists
            existing = await self.find_by_collection_and_album(collection_id, album_id)
            if existing:
                raise DuplicateFieldError(
                    field="album",
                    value=f"collection_{collection_id}_album_{album_id}"
                )
            
            # Convert state names to IDs using VinylStateMapping
            state_record_id = None
            state_cover_id = None
            
            if metadata.get('state_record'):
                state_record_id = VinylStateMapping.get_id_from_name(metadata['state_record'])
                if not state_record_id:
                    logger.warning(f"Invalid state_record value: {metadata['state_record']}")
            
            if metadata.get('state_cover'):
                state_cover_id = VinylStateMapping.get_id_from_name(metadata['state_cover'])
                if not state_cover_id:
                    logger.warning(f"Invalid state_cover value: {metadata['state_cover']}")
            
            # Create new association
            collection_album = CollectionAlbum(
                collection_id=collection_id,
                album_id=album_id,
                state_record=state_record_id,
                state_cover=state_cover_id,
                acquisition_month_year=metadata.get('acquisition_month_year')
            )
            
            return await self.create(collection_album)
            
        except DuplicateFieldError:
            raise
        except Exception as e:
            logger.error(f"Error adding album to collection: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to add album to collection",
                details={"error": str(e)}
            )

    async def update_album_metadata(self, collection_id: int, album_id: int, metadata: dict) -> CollectionAlbum:
        """Update album metadata in a collection"""
        try:
            collection_album = await self.find_by_collection_and_album(collection_id, album_id)
            if not collection_album:
                raise ResourceNotFoundError(
                    error_code=4004,
                    message="Album not found in collection",
                    details={"collection_id": collection_id, "album_id": album_id}
                )
            
            # Update metadata fields with conversion for states
            if 'state_record' in metadata:
                if metadata['state_record'] is None:
                    collection_album.state_record = None
                else:
                    state_record_id = VinylStateMapping.get_id_from_name(metadata['state_record'])
                    if not state_record_id:
                        logger.warning(f"Invalid state_record value: {metadata['state_record']}")
                    collection_album.state_record = state_record_id
                    
            if 'state_cover' in metadata:
                if metadata['state_cover'] is None:
                    collection_album.state_cover = None
                else:
                    state_cover_id = VinylStateMapping.get_id_from_name(metadata['state_cover'])
                    if not state_cover_id:
                        logger.warning(f"Invalid state_cover value: {metadata['state_cover']}")
                    collection_album.state_cover = state_cover_id
                    
            if 'acquisition_month_year' in metadata:
                collection_album.acquisition_month_year = metadata['acquisition_month_year']
            
            return await self.update(collection_album)
            
        except ResourceNotFoundError:
            raise
        except Exception as e:
            logger.error(f"Error updating album metadata: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to update album metadata",
                details={"error": str(e)}
            )

    async def remove_album_from_collection(self, collection_id: int, album_id: int) -> bool:
        """Remove an album from a collection"""
        try:
            collection_album = await self.find_by_collection_and_album(collection_id, album_id)
            if not collection_album:
                raise ResourceNotFoundError(
                    error_code=4004,
                    message="Album not found in collection",
                    details={"collection_id": collection_id, "album_id": album_id}
                )
            
            await self.delete(collection_album)
            return True
            
        except ResourceNotFoundError:
            raise
        except Exception as e:
            logger.error(f"Error removing album from collection: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to remove album from collection",
                details={"error": str(e)}
            )

    async def get_collection_albums(self, collection_id: int) -> List[tuple]:
        """Get all albums in a collection with metadata"""
        try:
            query = (
                select(Album, CollectionAlbum)
                .join(CollectionAlbum, Album.id == CollectionAlbum.album_id)
                .options(
                    selectinload(CollectionAlbum.state_record_ref),
                    selectinload(CollectionAlbum.state_cover_ref)
                )
                .filter(CollectionAlbum.collection_id == collection_id)
            )
            
            result = await self.db.execute(query)
            albums = result.all()
            return albums
            
        except Exception as e:
            logger.error(f"Error getting collection albums: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get collection albums",
                details={"error": str(e)}
            )

    async def get_collection_album_metadata(self, collection_id: int, album_id: int) -> Optional[CollectionAlbum]:
        """Get collection album metadata for a specific album in a collection"""
        try:
            query = (
                select(CollectionAlbum)
                .options(
                    selectinload(CollectionAlbum.state_record_ref),
                    selectinload(CollectionAlbum.state_cover_ref)
                )
                .filter(
                    CollectionAlbum.collection_id == collection_id,
                    CollectionAlbum.album_id == album_id
                )
            )
            
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
            
        except Exception as e:
            logger.error(f"Error getting collection album metadata: {str(e)}")
            return None

