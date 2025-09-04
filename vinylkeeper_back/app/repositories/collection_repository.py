from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload
from sqlalchemy import select, func, or_, and_
from sqlalchemy.exc import IntegrityError
from app.models.collection_model import Collection
from app.models.album_model import Album
from app.models.artist_model import Artist
from app.models.collection_album import CollectionAlbum
from app.models.association_tables import collection_artist
from app.models.like_model import Like
from app.core.exceptions import (
    ResourceNotFoundError,
    DuplicateFieldError,
    ServerError,
    ErrorCode
)
from app.core.logging import logger
from app.core.transaction import TransactionalMixin
from typing import List, Optional, Tuple


class CollectionRepository(TransactionalMixin):
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, collection: Collection) -> Collection:
        """Create a new collection without committing (transaction managed by service)."""
        try:
            await self._add_entity(collection, flush=True)  # Flush to get the ID
            await self._refresh_entity(collection)
            return collection
        except IntegrityError as e:
            logger.error(f"Database integrity error creating collection: {str(e)}")
            raise DuplicateFieldError("name", collection.name)
        except Exception as e:
            logger.error(f"Unexpected error creating collection: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to create collection",
                details={"error": str(e)}
            )

    async def get_by_id(self, collection_id: int, load_relations: bool = True) -> Collection:
        """Get a collection by its ID with optimized relation loading."""
        try:
            query = select(Collection).filter(Collection.id == collection_id)
            
            if load_relations:
                query = query.options(
                    selectinload(Collection.owner),
                    selectinload(Collection.collection_albums).selectinload(CollectionAlbum.album),
                    selectinload(Collection.collection_albums).selectinload(CollectionAlbum.state_record_ref),
                    selectinload(Collection.collection_albums).selectinload(CollectionAlbum.state_cover_ref),
                    selectinload(Collection.artists),
                    selectinload(Collection.mood),
                    selectinload(Collection.likes)
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
        """Get all collections owned by a user with optimized relation loading."""
        try:
            query = select(Collection).filter(Collection.owner_id == owner_id).order_by(Collection.updated_at.desc())
            
            # Preload relations to avoid N+1 queries
            query = query.options(
                selectinload(Collection.owner),
                selectinload(Collection.collection_albums).selectinload(CollectionAlbum.album),
                selectinload(Collection.artists),
                selectinload(Collection.mood),
                selectinload(Collection.likes)
            )
            
            result = await self.db.execute(query)
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error retrieving collections for owner {owner_id}: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to retrieve user collections",
                details={"error": str(e)}
            )

    async def count_by_owner(self, owner_id: int) -> int:
        """Count collections owned by a user."""
        try:
            query = select(func.count(Collection.id)).filter(Collection.owner_id == owner_id)
            result = await self.db.execute(query)
            return result.scalar() or 0
        except Exception as e:
            logger.error(f"Error counting collections for owner {owner_id}: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to count user collections",
                details={"error": str(e)}
            )

    async def update(self, collection: Collection) -> Collection:
        """Update an existing collection without committing (transaction managed by service)."""
        try:
            await self._add_entity(collection, flush=True)  # Flush to ensure changes are persisted
            await self._refresh_entity(collection)
            return collection
        except IntegrityError as e:
            logger.error(f"Database integrity error updating collection: {str(e)}")
            raise DuplicateFieldError("name", collection.name)
        except Exception as e:
            logger.error(f"Unexpected error updating collection: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to update collection",
                details={"error": str(e)}
            )

    async def delete(self, collection: Collection) -> bool:
        """Delete a collection without committing (transaction managed by service)."""
        try:
            await self._delete_entity(collection)
            return True
        except Exception as e:
            logger.error(f"Error deleting collection: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to delete collection",
                details={"error": str(e)}
            )

    async def add_albums(self, collection: Collection, album_ids: List[int]) -> None:
        """Add albums to a collection using batch operations (optimized)."""
        try:
            if not album_ids:
                return
                
            # Check which albums already exist in collection (single query)
            existing_query = select(CollectionAlbum.album_id).filter(
                CollectionAlbum.collection_id == collection.id,
                CollectionAlbum.album_id.in_(album_ids)
            )
            existing_result = await self.db.execute(existing_query)
            existing_album_ids = {row[0] for row in existing_result.all()}
            
            # Filter out albums that are already in collection
            new_album_ids = [album_id for album_id in album_ids if album_id not in existing_album_ids]
            
            if not new_album_ids:
                return  # All albums already in collection
            
            # Verify albums exist (single query)
            albums_query = select(Album.id).filter(Album.id.in_(new_album_ids))
            albums_result = await self.db.execute(albums_query)
            valid_album_ids = {row[0] for row in albums_result.all()}
            
            # Create collection-album associations in batch
            collection_albums = [
                CollectionAlbum(
                    collection_id=collection.id,
                    album_id=album_id
                )
                for album_id in valid_album_ids
            ]
            
            if collection_albums:
                self.db.add_all(collection_albums)
                await self.db.flush()  # Flush without commit (transaction managed by service)
                
        except Exception as e:
            logger.error(f"Error adding albums to collection: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to add albums to collection",
                details={"error": str(e)}
            )

    async def add_artists(self, collection: Collection, artist_ids: List[int]) -> None:
        """Add artists to a collection using batch operations (optimized)."""
        try:
            if not artist_ids:
                return
                

            
            # Check which artists already exist in collection (single query)
            existing_query = select(collection_artist.c.artist_id).filter(
                collection_artist.c.collection_id == collection.id,
                collection_artist.c.artist_id.in_(artist_ids)
            )
            existing_result = await self.db.execute(existing_query)
            existing_artist_ids = {row[0] for row in existing_result.all()}
            
            # Filter out artists that are already in collection
            new_artist_ids = [artist_id for artist_id in artist_ids if artist_id not in existing_artist_ids]
            
            if not new_artist_ids:
                return  # All artists already in collection
            
            # Verify artists exist (single query)
            artists_query = select(Artist.id).filter(Artist.id.in_(new_artist_ids))
            artists_result = await self.db.execute(artists_query)
            valid_artist_ids = {row[0] for row in artists_result.all()}
            
            # Insert associations in batch
            if valid_artist_ids:
                insert_values = [
                    {"collection_id": collection.id, "artist_id": artist_id}
                    for artist_id in valid_artist_ids
                ]
                insert_query = collection_artist.insert().values(insert_values)
                await self.db.execute(insert_query)
                await self.db.flush()  # Flush without commit (transaction managed by service)
                
        except Exception as e:
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
            
            # Transaction managed by service layer
        except Exception as e:
            logger.error(f"Error removing albums from collection: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to remove albums from collection",
                details={"error": str(e)}
            )

    async def remove_artists(self, collection: Collection, artist_ids: List[int]) -> None:
        """Remove artists from a collection."""
        try:

            
            # Remove artists from collection through association table
            delete_query = collection_artist.delete().where(
                collection_artist.c.collection_id == collection.id,
                collection_artist.c.artist_id.in_(artist_ids)
            )
            await self.db.execute(delete_query)
            
            # Transaction managed by service layer
        except Exception as e:
            logger.error(f"Error removing artists from collection: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to remove artists from collection",
                details={"error": str(e)}
            )

    async def remove_artist(self, collection: Collection, artist_id: int) -> bool:
        """Remove a specific artist from a collection."""
        try:

            
            # Delete from association table
            delete_query = collection_artist.delete().where(
                collection_artist.c.collection_id == collection.id,
                collection_artist.c.artist_id == artist_id
            )
            result = await self.db.execute(delete_query)
            
            # Transaction managed by service layer
            return result.rowcount > 0
        except Exception as e:
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
            
            # Preload relations to avoid N+1 queries
            query = query.options(
                selectinload(Collection.owner),
                selectinload(Collection.collection_albums),
                selectinload(Collection.artists)
            )
            
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

    async def get_collections_likes_counts(self, collection_ids: List[int]) -> dict:
        """Get likes counts for multiple collections in one query."""

        
        query = select(Like.collection_id, func.count(Like.id)).filter(
            Like.collection_id.in_(collection_ids)
        ).group_by(Like.collection_id)
        
        result = await self.db.execute(query)
        likes_counts = {collection_id: count for collection_id, count in result.all()}
        
        # Ensure all collection_ids have a count (even if 0)
        for collection_id in collection_ids:
            if collection_id not in likes_counts:
                likes_counts[collection_id] = 0
                
        return likes_counts

    async def get_user_collections_likes(self, user_id: int, collection_ids: List[int]) -> dict:
        """Get which collections are liked by a user in one query."""

        
        query = select(Like.collection_id).filter(
            and_(Like.user_id == user_id, Like.collection_id.in_(collection_ids))
        )
        
        result = await self.db.execute(query)
        liked_collection_ids = {row[0] for row in result.all()}
        
        # Create a dict mapping collection_id to is_liked boolean
        return {collection_id: collection_id in liked_collection_ids for collection_id in collection_ids}

    async def get_user_collections(self, user_id: int, page: int = 1, limit: int = 10) -> Tuple[List[Collection], int]:
        """Get user's collections with pagination and optimized relation loading."""
        try:
            # Build base query
            query = select(Collection).filter(Collection.owner_id == user_id)
            
            # Get total count
            count_query = select(func.count()).select_from(query.subquery())
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()
            
            # Apply pagination
            offset = (page - 1) * limit
            query = query.order_by(Collection.created_at.desc()).offset(offset).limit(limit)
            
            # Preload relations to avoid N+1 queries
            query = query.options(
                selectinload(Collection.owner),
                selectinload(Collection.collection_albums).selectinload(CollectionAlbum.album),
                selectinload(Collection.artists),
                selectinload(Collection.mood),
                selectinload(Collection.likes)
            )
            
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
        """Get all albums in a collection with optimized relation loading."""
        try:
            query = select(Album).join(CollectionAlbum).filter(CollectionAlbum.collection_id == collection_id)
            
            # Preload relations to avoid N+1 queries
            query = query.options(
                selectinload(Album.external_source),
                selectinload(Album.album_collections).selectinload(CollectionAlbum.state_record_ref),
                selectinload(Album.album_collections).selectinload(CollectionAlbum.state_cover_ref),
                selectinload(Album.loans)
            )
            
            result = await self.db.execute(query)
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error getting collection albums: {str(e)}")
            return []

    async def get_collection_artists_paginated(self, collection_id: int, page: int = 1, limit: int = 12) -> Tuple[List[Artist], int]:
        """Get paginated artists from a collection with optimized relation loading."""
        try:
            # Import the association table

            
            # Build base query using the association table
            query = select(Artist).join(collection_artist).filter(collection_artist.c.collection_id == collection_id)
            
            # Preload relations to avoid N+1 queries
            query = query.options(
                selectinload(Artist.external_source),
                selectinload(Artist.collections)
            )
            
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
        """Search collections by name or description with optimized relation loading."""
        try:
            base_query = select(Collection).filter(
                or_(
                    Collection.name.ilike(f"%{query}%"),
                    Collection.description.ilike(f"%{query}%")
                )
            )
            
            if user_id:
                base_query = base_query.filter(Collection.owner_id == user_id)
            
            # Preload relations to avoid N+1 queries
            base_query = base_query.options(
                selectinload(Collection.owner),
                selectinload(Collection.collection_albums).selectinload(CollectionAlbum.album),
                selectinload(Collection.artists),
                selectinload(Collection.mood)
            )
            
            result = await self.db.execute(base_query)
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error searching collections: {str(e)}")
            return []

    async def search_collection_albums(self, collection_id: int, query: str) -> List[Album]:
        """Search albums in a collection with optimized relation loading."""
        try:
            search_query = select(Album).join(CollectionAlbum).filter(
                CollectionAlbum.collection_id == collection_id,
                or_(Album.title.ilike(f"%{query}%"))
            )
            
            # Preload relations to avoid N+1 queries
            search_query = search_query.options(
                selectinload(Album.external_source),
                selectinload(Album.album_collections).selectinload(CollectionAlbum.state_record_ref),
                selectinload(Album.album_collections).selectinload(CollectionAlbum.state_cover_ref)
            )
            
            result = await self.db.execute(search_query)
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error searching collection albums: {str(e)}")
            return []

    async def search_collection_artists(self, collection_id: int, query: str) -> List[Artist]:
        """Search artists in a collection with optimized relation loading."""
        try:

            
            # Search artists in collection using association table
            artist_query = select(Artist).join(collection_artist).filter(
                collection_artist.c.collection_id == collection_id,
                or_(Artist.title.ilike(f"%{query}%"))
            )
            
            # Preload relations to avoid N+1 queries
            artist_query = artist_query.options(
                selectinload(Artist.external_source),
                selectinload(Artist.collections)
            )
            
            result = await self.db.execute(artist_query)
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error searching collection artists: {str(e)}")
            return []

    async def refresh(self, collection: Collection) -> Collection:
        """Refresh a collection object from the database."""
        try:
            await self.db.refresh(collection)
            return collection
        except Exception as e:
            logger.error(f"Error refreshing collection {collection.id}: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to refresh collection",
                details={"error": str(e)}
            )
