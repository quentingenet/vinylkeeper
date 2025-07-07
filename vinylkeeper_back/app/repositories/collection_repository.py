from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from app.models.collection_model import Collection
from app.models.album_model import Album
from app.models.artist_model import Artist
from app.models.collection_album import CollectionAlbum
from app.core.exceptions import (
    ResourceNotFoundError,
    DuplicateFieldError,
    ServerError,
    ErrorCode
)
from app.core.logging import logger
from typing import List, Optional, Tuple
from sqlalchemy import or_


class CollectionRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, collection: Collection) -> Collection:
        """Create a new collection."""
        try:
            self.db.add(collection)
            await self.db.commit()
            await self.db.refresh(collection)
            return collection
        except IntegrityError as e:
            await self.db.rollback()
            logger.error(f"Database integrity error creating collection: {str(e)}")
            raise DuplicateFieldError("name", collection.name)
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Unexpected error creating collection: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to create collection",
                details={"error": str(e)}
            )

    async def get_by_id(self, collection_id: int, load_relations: bool = False) -> Collection:
        """Get a collection by its ID."""
        try:
            query = select(Collection).filter(Collection.id == collection_id)
            
            if load_relations:
                query = query.options(
                    selectinload(Collection.owner),
                    selectinload(Collection.albums),
                    selectinload(Collection.artists)
                )
            
            result = await self.db.execute(query)
            collection = result.scalar_one_or_none()
            if not collection:
                raise ResourceNotFoundError("Collection", collection_id)
            return collection
        except ResourceNotFoundError:
            raise
        except Exception as e:
            logger.error(f"Error retrieving collection {collection_id}: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to retrieve collection",
                details={"error": str(e)}
            )

    async def get_by_owner(self, owner_id: int) -> List[Collection]:
        """Get all collections owned by a user."""
        try:
            query = select(Collection).filter(Collection.owner_id == owner_id).order_by(Collection.updated_at.desc())
            result = await self.db.execute(query)
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error retrieving collections for owner {owner_id}: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to retrieve user collections",
                details={"error": str(e)}
            )

    async def update(self, collection: Collection) -> Collection:
        """Update an existing collection."""
        try:
            self.db.add(collection)
            await self.db.commit()
            await self.db.refresh(collection)
            return collection
        except IntegrityError as e:
            await self.db.rollback()
            logger.error(f"Database integrity error updating collection: {str(e)}")
            raise DuplicateFieldError("name", collection.name)
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Unexpected error updating collection: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to update collection",
                details={"error": str(e)}
            )

    async def delete(self, collection: Collection) -> bool:
        """Delete a collection."""
        try:
            await self.db.delete(collection)
            await self.db.commit()
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting collection: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to delete collection",
                details={"error": str(e)}
            )

    async def add_albums(self, collection: Collection, album_ids: List[int]) -> None:
        """Add albums to a collection."""
        try:
            query = select(Album).filter(Album.id.in_(album_ids))
            result = await self.db.execute(query)
            albums = result.scalars().all()
            
            for album in albums:
                # Check if album is already in collection
                existing_query = select(CollectionAlbum).filter(
                    CollectionAlbum.collection_id == collection.id,
                    CollectionAlbum.album_id == album.id
                )
                existing_result = await self.db.execute(existing_query)
                if not existing_result.scalar_one_or_none():
                    collection_album = CollectionAlbum(
                        collection_id=collection.id,
                        album_id=album.id
                    )
                    self.db.add(collection_album)
            
            await self.db.commit()
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error adding albums to collection: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to add albums to collection",
                details={"error": str(e)}
            )

    async def add_artists(self, collection: Collection, artist_ids: List[int]) -> None:
        """Add artists to a collection."""
        try:
            from app.models.association_tables import collection_artist
            
            # Check if artists exist
            query = select(Artist).filter(Artist.id.in_(artist_ids))
            result = await self.db.execute(query)
            artists = result.scalars().all()
            
            # Add artists to collection through association table
            for artist in artists:
                # Check if artist is already in collection
                existing_query = select(collection_artist).filter(
                    collection_artist.c.collection_id == collection.id,
                    collection_artist.c.artist_id == artist.id
                )
                existing_result = await self.db.execute(existing_query)
                if not existing_result.scalar_one_or_none():
                    # Insert into association table
                    insert_query = collection_artist.insert().values(
                        collection_id=collection.id,
                        artist_id=artist.id
                    )
                    await self.db.execute(insert_query)
            
            await self.db.commit()
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error adding artists to collection: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to add artists to collection",
                details={"error": str(e)}
            )

    async def remove_albums(self, collection: Collection, album_ids: List[int]) -> None:
        """Remove albums from a collection."""
        try:
            query = select(CollectionAlbum).filter(
                CollectionAlbum.collection_id == collection.id,
                CollectionAlbum.album_id.in_(album_ids)
            )
            result = await self.db.execute(query)
            collection_albums = result.scalars().all()
            
            for ca in collection_albums:
                await self.db.delete(ca)
            
            await self.db.commit()
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error removing albums from collection: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to remove albums from collection",
                details={"error": str(e)}
            )

    async def remove_artists(self, collection: Collection, artist_ids: List[int]) -> None:
        """Remove artists from a collection."""
        try:
            from app.models.association_tables import collection_artist
            
            # Remove artists from collection through association table
            delete_query = collection_artist.delete().where(
                collection_artist.c.collection_id == collection.id,
                collection_artist.c.artist_id.in_(artist_ids)
            )
            await self.db.execute(delete_query)
            
            await self.db.commit()
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error removing artists from collection: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to remove artists from collection",
                details={"error": str(e)}
            )

    async def remove_artist(self, collection: Collection, artist_id: int) -> bool:
        """Remove a specific artist from a collection."""
        try:
            from app.models.association_tables import collection_artist
            
            # Delete from association table
            delete_query = collection_artist.delete().where(
                collection_artist.c.collection_id == collection.id,
                collection_artist.c.artist_id == artist_id
            )
            result = await self.db.execute(delete_query)
            
            await self.db.commit()
            return result.rowcount > 0
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error removing artist from collection: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to remove artist from collection",
                details={"error": str(e)}
            )

    async def get_public_collections(self, page: int = 1, limit: int = 10, exclude_user_id: Optional[int] = None) -> Tuple[List[Collection], int]:
        """Get all public collections with pagination."""
        try:
            # Build base query
            query = select(Collection).filter(Collection.is_public == True)
            
            if exclude_user_id:
                query = query.filter(Collection.owner_id != exclude_user_id)
            
            # Get total count
            count_query = select(func.count()).select_from(query.subquery())
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()
            
            # Apply pagination
            offset = (page - 1) * limit
            query = query.order_by(Collection.updated_at.desc()).offset(offset).limit(limit)
            
            result = await self.db.execute(query)
            collections = result.scalars().all()
            
            return collections, total
        except Exception as e:
            logger.error(f"Error retrieving public collections: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to retrieve public collections",
                details={"error": str(e)}
            )

    async def get_user_collections(self, user_id: int, page: int = 1, limit: int = 10) -> Tuple[List[Collection], int]:
        """Get user's collections with pagination."""
        try:
            # Build base query
            query = select(Collection).filter(Collection.owner_id == user_id)
            
            # Get total count
            count_query = select(func.count()).select_from(query.subquery())
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()
            
            # Apply pagination
            offset = (page - 1) * limit
            query = query.order_by(Collection.updated_at.desc()).offset(offset).limit(limit)
            
            result = await self.db.execute(query)
            collections = result.scalars().all()
            
            return collections, total
        except Exception as e:
            logger.error(f"Error retrieving user collections: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to retrieve user collections",
                details={"error": str(e)}
            )

    async def count_user_collections(self, user_id: int) -> int:
        """Count user's collections."""
        try:
            query = select(func.count()).filter(Collection.owner_id == user_id)
            result = await self.db.execute(query)
            return result.scalar()
        except Exception as e:
            logger.error(f"Error counting user collections: {str(e)}")
            return 0

    async def get_collection_albums(self, collection_id: int) -> List[Album]:
        """Get all albums in a collection."""
        try:
            query = select(Album).join(CollectionAlbum).filter(CollectionAlbum.collection_id == collection_id)
            result = await self.db.execute(query)
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error getting collection albums: {str(e)}")
            return []

    async def get_collection_artists_paginated(self, collection_id: int, page: int = 1, limit: int = 12) -> Tuple[List[Artist], int]:
        """Get paginated artists from a collection."""
        try:
            # Import the association table
            from app.models.association_tables import collection_artist
            
            # Build base query using the association table and include external_source
            query = select(Artist).join(collection_artist).filter(collection_artist.c.collection_id == collection_id)
            # Note: We'll need to load external_source separately since joinedload doesn't work well with async
            
            # Get total count
            count_query = select(func.count()).select_from(query.subquery())
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()
            
            # Apply pagination
            offset = (page - 1) * limit
            query = query.offset(offset).limit(limit)
            
            result = await self.db.execute(query)
            artists = result.scalars().all()
            
            return artists, total
        except Exception as e:
            logger.error(f"Error getting collection artists paginated: {str(e)}")
            return [], 0

    async def search_collection_items(self, collection_id: int, query: str, search_type: str = "both") -> dict:
        """Search items in a collection."""
        try:
            results = {"albums": [], "artists": []}
            
            if search_type in ["albums", "both"]:
                # Search albums
                album_query = select(Album).join(CollectionAlbum).filter(
                    CollectionAlbum.collection_id == collection_id,
                    or_(Album.title.ilike(f"%{query}%"))
                )
                album_result = await self.db.execute(album_query)
                results["albums"] = album_result.scalars().all()
            
            if search_type in ["artists", "both"]:
                # Search artists using association table
                from app.models.association_tables import collection_artist
                artist_query = select(Artist).join(collection_artist).filter(
                    collection_artist.c.collection_id == collection_id,
                    or_(Artist.title.ilike(f"%{query}%"))
                )
                artist_result = await self.db.execute(artist_query)
                results["artists"] = artist_result.scalars().all()
            
            return results
        except Exception as e:
            logger.error(f"Error searching collection items: {str(e)}")
            return {"albums": [], "artists": []}

    async def search_collections(self, query: str, user_id: Optional[int] = None) -> List[Collection]:
        """Search collections by name or description."""
        try:
            base_query = select(Collection).filter(
                or_(
                    Collection.name.ilike(f"%{query}%"),
                    Collection.description.ilike(f"%{query}%")
                )
            )
            
            if user_id:
                base_query = base_query.filter(Collection.owner_id == user_id)
            
            result = await self.db.execute(base_query)
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error searching collections: {str(e)}")
            return []

    async def search_collection_albums(self, collection_id: int, query: str) -> List[Album]:
        """Search albums in a collection."""
        try:
            query = select(Album).join(CollectionAlbum).filter(
                CollectionAlbum.collection_id == collection_id,
                or_(Album.title.ilike(f"%{query}%"))
            )
            result = await self.db.execute(query)
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error searching collection albums: {str(e)}")
            return []

    async def search_collection_artists(self, collection_id: int, query: str) -> List[Artist]:
        """Search artists in a collection."""
        try:
            from app.models.association_tables import collection_artist
            
            # Search artists in collection using association table
            artist_query = select(Artist).join(collection_artist).filter(
                collection_artist.c.collection_id == collection_id,
                or_(Artist.title.ilike(f"%{query}%"))
            )
            result = await self.db.execute(artist_query)
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error searching collection artists: {str(e)}")
            return []
