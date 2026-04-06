from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload
from sqlalchemy import select, func, or_, and_, case, delete
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from app.models.collection_model import Collection
from app.models.album_model import Album
from app.models.artist_model import Artist
from app.models.collection_album import CollectionAlbum
from app.models.association_tables import CollectionArtist, collection_artist
from app.models.like_model import Like
from app.core.exceptions import (
    ResourceNotFoundError,
    DuplicateFieldError,
    ServerError,
    ErrorCode
)
from app.core.logging import logger
from app.core.transaction import TransactionalMixin
from datetime import datetime, timezone
from typing import List, Optional, Tuple, Dict


class CollectionRepository(TransactionalMixin):
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, collection: Collection) -> Collection:
        """Create a new collection without committing (transaction managed by service)."""
        try:
            # Flush to get the ID
            await self._add_entity(collection, flush=True)
            await self._refresh_entity(collection)
            return collection
        except IntegrityError as e:
            logger.error(
                f"Database integrity error creating collection: {str(e)}")
            raise DuplicateFieldError("name", collection.name)
        except SQLAlchemyError as e:
            logger.error(f"Unexpected error creating collection: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to create collection",
                details={}
            )

    async def get_by_id(self, collection_id: int, load_relations: bool = True, load_minimal: bool = False) -> Collection:
        """
        Get a collection by its ID with optimized relation loading.

        Args:
            load_relations: If True, load all relations (albums, artists, likes, etc.)
            load_minimal: If True, load only owner (optimized for lightweight responses)
        """
        try:
            query = select(Collection).filter(Collection.id == collection_id)

            if load_minimal:
                # Only load owner for lightweight responses
                query = query.options(selectinload(Collection.owner))
            elif load_relations:
                query = query.options(
                    selectinload(Collection.owner),
                    selectinload(Collection.collection_albums).selectinload(
                        CollectionAlbum.album),
                    selectinload(Collection.collection_albums).selectinload(
                        CollectionAlbum.state_record_ref),
                    selectinload(Collection.collection_albums).selectinload(
                        CollectionAlbum.state_cover_ref),
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
        except SQLAlchemyError as e:
            logger.error(
                f"Error retrieving collection {collection_id}: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to retrieve collection",
                details={}
            )

    async def find_by_name_and_owner(self, name: str, owner_id: int) -> Optional[Collection]:
        """Find a collection by name and owner ID."""
        try:
            query = select(Collection).filter(
                Collection.name == name,
                Collection.owner_id == owner_id
            )
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except SQLAlchemyError as e:
            logger.error(
                f"Error finding collection by name and owner: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to find collection",
                details={}
            )

    async def count_public_by_owner(self, owner_id: int) -> int:
        """Count public collections owned by a user."""
        try:
            query = select(func.count(Collection.id)).filter(
                and_(
                    Collection.owner_id == owner_id,
                    Collection.is_public == True
                )
            )
            result = await self.db.execute(query)
            return result.scalar() or 0
        except SQLAlchemyError as e:
            logger.error(
                f"Error counting public collections for owner {owner_id}: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to count public collections by owner",
                details={}
            )

    async def update(self, collection: Collection) -> Collection:
        """Update an existing collection without committing (transaction managed by service)."""
        try:
            # Flush to ensure changes are persisted
            await self._add_entity(collection, flush=True)
            await self._refresh_entity(collection)
            return collection
        except IntegrityError as e:
            logger.error(
                f"Database integrity error updating collection: {str(e)}")
            raise DuplicateFieldError("name", collection.name)
        except SQLAlchemyError as e:
            logger.error(f"Unexpected error updating collection: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to update collection",
                details={}
            )

    async def delete(self, collection: Collection) -> bool:
        """Delete a collection without committing (transaction managed by service)."""
        try:
            await self._delete_entity(collection)
            return True
        except SQLAlchemyError as e:
            logger.error(f"Error deleting collection: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to delete collection",
                details={}
            )

    async def add_albums(self, collection: Collection, album_ids: List[int]) -> None:
        """Add albums to a collection using batch operations (optimized)."""
        try:
            if not album_ids:
                return

            existing_query = select(CollectionAlbum.album_id).filter(
                CollectionAlbum.collection_id == collection.id,
                CollectionAlbum.album_id.in_(album_ids)
            )
            existing_result = await self.db.execute(existing_query)
            existing_album_ids = {row[0] for row in existing_result.all()}

            new_album_ids = [
                album_id for album_id in album_ids if album_id not in existing_album_ids]

            if not new_album_ids:
                existing_associations = await self.db.execute(
                    select(CollectionAlbum).filter(
                        CollectionAlbum.collection_id == collection.id,
                        CollectionAlbum.album_id.in_(album_ids)
                    )
                )
                for assoc in existing_associations.scalars():
                    # Update only updated_at - never modify created_at
                    assoc.updated_at = datetime.now(timezone.utc)
                    if assoc.created_at is None:
                        assoc.created_at = assoc.updated_at
                await self.db.flush()
                return

            albums_query = select(Album.id).filter(Album.id.in_(new_album_ids))
            albums_result = await self.db.execute(albums_query)
            valid_album_ids = {row[0] for row in albums_result.all()}

            if valid_album_ids:
                now = datetime.now(timezone.utc)
                collection_albums = [
                    CollectionAlbum(
                        collection_id=collection.id,
                        album_id=album_id,
                        created_at=now,
                        updated_at=now
                    )
                    for album_id in valid_album_ids
                ]
                self.db.add_all(collection_albums)
                await self.db.flush()

        except SQLAlchemyError as e:
            logger.error(f"Error adding albums to collection: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to add albums to collection",
                details={}
            )

    async def add_artists(self, collection: Collection, artist_ids: List[int]) -> None:
        """Add artists to a collection using batch operations (optimized)."""
        try:
            if not artist_ids:
                return

            existing_query = select(CollectionArtist.artist_id).filter(
                CollectionArtist.collection_id == collection.id,
                CollectionArtist.artist_id.in_(artist_ids)
            )
            existing_result = await self.db.execute(existing_query)
            existing_artist_ids = {row[0] for row in existing_result.all()}

            new_artist_ids = [
                artist_id for artist_id in artist_ids if artist_id not in existing_artist_ids]

            if not new_artist_ids:
                existing_associations = await self.db.execute(
                    select(CollectionArtist).filter(
                        CollectionArtist.collection_id == collection.id,
                        CollectionArtist.artist_id.in_(artist_ids)
                    )
                )
                for assoc in existing_associations.scalars():
                    # Update only updated_at - never modify created_at
                    assoc.updated_at = datetime.now(timezone.utc)
                    if assoc.created_at is None:
                        assoc.created_at = assoc.updated_at
                await self.db.flush()
                return

            artists_query = select(Artist.id).filter(
                Artist.id.in_(new_artist_ids))
            artists_result = await self.db.execute(artists_query)
            valid_artist_ids = {row[0] for row in artists_result.all()}

            if valid_artist_ids:
                now = datetime.now(timezone.utc)
                collection_artists = [
                    CollectionArtist(
                        collection_id=collection.id,
                        artist_id=artist_id,
                        created_at=now,
                        updated_at=now
                    )
                    for artist_id in valid_artist_ids
                ]
                self.db.add_all(collection_artists)
                await self.db.flush()

        except SQLAlchemyError as e:
            logger.error(f"Error adding artists to collection: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to add artists to collection",
                details={}
            )

    async def remove_albums(self, collection: Collection, album_ids: List[int]) -> None:
        """Remove albums from a collection."""
        try:
            await self.db.execute(
                delete(CollectionAlbum).where(
                    CollectionAlbum.collection_id == collection.id,
                    CollectionAlbum.album_id.in_(album_ids)
                )
            )
        except SQLAlchemyError as e:
            logger.error(f"Error removing albums from collection: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to remove albums from collection",
                details={}
            )

    async def remove_artists(self, collection: Collection, artist_ids: List[int]) -> None:
        """Remove artists from a collection."""
        try:
            await self.db.execute(
                delete(CollectionArtist).where(
                    CollectionArtist.collection_id == collection.id,
                    CollectionArtist.artist_id.in_(artist_ids)
                )
            )
        except SQLAlchemyError as e:
            logger.error(f"Error removing artists from collection: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to remove artists from collection",
                details={}
            )

    async def remove_artist(self, collection: Collection, artist_id: int) -> bool:
        """Remove a specific artist from a collection."""
        try:
            # Delete from association model
            query = select(CollectionArtist).filter(
                CollectionArtist.collection_id == collection.id,
                CollectionArtist.artist_id == artist_id
            )
            result = await self.db.execute(query)
            collection_artist_obj = result.scalar_one_or_none()

            if collection_artist_obj:
                await self.db.delete(collection_artist_obj)
                return True
            return False
        except SQLAlchemyError as e:
            logger.error(f"Error removing artist from collection: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to remove artist from collection",
                details={}
            )

    async def get_public_collections(self, page: int = 1, limit: int = 10, exclude_user_id: Optional[int] = None, sort_by: str = "updated_at") -> Tuple[List[Collection], int]:
        """Get all public collections with pagination and sorting.
        Only returns collections with at least one album, artist, or wishlist item."""
        try:
            from app.models.like_model import Like
            from app.models.wishlist_model import Wishlist

            # Build base query
            query = select(Collection).filter(Collection.is_public == True)

            if exclude_user_id:
                query = query.filter(Collection.owner_id != exclude_user_id)

            # Add subqueries for filtering collections with content
            # Collections must have at least one album, artist, or wishlist item
            has_albums = select(1).where(
                CollectionAlbum.collection_id == Collection.id
            ).exists()

            has_artists = select(1).where(
                CollectionArtist.collection_id == Collection.id
            ).exists()

            # For wishlist, we need to check if the owner has any wishlist items
            # This is more complex as wishlist is user-scoped, not collection-scoped
            # We'll simplify by checking if collection has albums or artists

            # Combine filters: collection must have albums OR artists
            query = query.filter(has_albums | has_artists)

            # Get total count BEFORE applying grouping for likes_count
            from sqlalchemy import distinct
            count_query = select(func.count(distinct(Collection.id)))
            count_query = count_query.filter(Collection.is_public == True)
            if exclude_user_id:
                count_query = count_query.filter(
                    Collection.owner_id != exclude_user_id)
            count_query = count_query.filter(has_albums | has_artists)

            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            # Add subqueries for counting albums and artists (optimized for list view)
            albums_count_subq = (
                select(func.count(CollectionAlbum.album_id))
                .where(CollectionAlbum.collection_id == Collection.id)
                .scalar_subquery()
            )

            artists_count_subq = (
                select(func.count(CollectionArtist.artist_id))
                .where(CollectionArtist.collection_id == Collection.id)
                .scalar_subquery()
            )

            # Add counts to query (only for list view, not loading full relations)
            query = query.add_columns(
                albums_count_subq.label('albums_count'),
                artists_count_subq.label('artists_count')
            )

            # Apply sorting based on sort_by parameter
            if sort_by == "likes_count":
                # Use LEFT JOIN with likes and COUNT to get all collections (even with 0 likes)
                query = query.outerjoin(
                    Like,
                    Collection.id == Like.collection_id
                )
                # Group by collection id and scalar subqueries (required by PostgreSQL when using add_columns)
                # Scalar subqueries depend only on Collection.id, so they're functionally dependent
                query = query.group_by(
                    Collection.id,
                    albums_count_subq,
                    artists_count_subq
                ).order_by(
                    func.coalesce(func.count(Like.id), 0).desc()
                )
            elif sort_by == "created_at":
                query = query.order_by(Collection.created_at.desc())
            else:  # default to updated_at
                query = query.order_by(Collection.updated_at.desc())

            # Apply pagination
            offset = (page - 1) * limit
            query = query.offset(offset).limit(limit)

            # Only preload owner (not albums/artists for list view performance)
            query = query.options(
                selectinload(Collection.owner)
            )

            result = await self.db.execute(query)
            # Handle result with counts: result is a list of tuples (Collection, albums_count, artists_count)
            rows = result.all()

            if not rows:
                return [], total

            collections = [row[0] for row in rows]

            # Attach counts to collection objects for easy access
            for collection, albums_count, artists_count in rows:
                collection.albums_count = albums_count or 0
                collection.artists_count = artists_count or 0

            return collections, total
        except SQLAlchemyError as e:
            logger.error(f"Error retrieving public collections: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to retrieve public collections",
                details={}
            )

    async def get_collections_likes_counts(self, collection_ids: List[int]) -> dict:
        """Get likes counts for multiple collections in one query."""

        query = select(Like.collection_id, func.count(Like.id)).filter(
            Like.collection_id.in_(collection_ids)
        ).group_by(Like.collection_id)

        result = await self.db.execute(query)
        likes_counts = {collection_id: count for collection_id,
                        count in result.all()}

        # Ensure all collection_ids have a count (even if 0)
        for collection_id in collection_ids:
            if collection_id not in likes_counts:
                likes_counts[collection_id] = 0

        return likes_counts

    async def get_collection_counts(self, collection_id: int) -> Dict[str, int]:
        """
        Get albums_count and artists_count for a single collection (optimized with aggregation).

        Returns:
            dict: {"albums_count": int, "artists_count": int}
        """
        try:
            # Albums count (CollectionAlbum uses composite primary key, so count album_id)
            albums_count_query = select(func.count(CollectionAlbum.album_id)).filter(
                CollectionAlbum.collection_id == collection_id
            )
            albums_result = await self.db.execute(albums_count_query)
            albums_count = albums_result.scalar() or 0

            # Artists count
            artists_count_query = select(func.count(CollectionArtist.artist_id)).filter(
                CollectionArtist.collection_id == collection_id
            )
            artists_result = await self.db.execute(artists_count_query)
            artists_count = artists_result.scalar() or 0

            return {
                "albums_count": albums_count,
                "artists_count": artists_count
            }
        except SQLAlchemyError as e:
            logger.error(
                f"Error getting collection counts for collection {collection_id}: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to get collection counts",
                details={}
            )

    async def get_user_collections_likes(self, user_id: int, collection_ids: List[int]) -> dict:
        """Get which collections are liked by a user in one query."""

        query = select(Like.collection_id).filter(
            and_(Like.user_id == user_id, Like.collection_id.in_(collection_ids))
        )

        result = await self.db.execute(query)
        liked_collection_ids = {row[0] for row in result.all()}

        # Create a dict mapping collection_id to is_liked boolean
        return {collection_id: collection_id in liked_collection_ids for collection_id in collection_ids}

    async def get_collections_likes_info_batch(self, user_id: Optional[int], collection_ids: List[int]) -> dict:
        """Get both likes counts and user likes status in a single optimized query."""
        if not collection_ids:
            return {'counts': {}, 'user_likes': {}}

        # Single query with aggregation: counts and user like status
        query = select(
            Like.collection_id,
            func.count(Like.id).label('count'),
            func.max(case((Like.user_id == user_id, 1), else_=0)
                     ).label('is_liked')
        ).filter(
            Like.collection_id.in_(collection_ids)
        ).group_by(Like.collection_id)

        result = await self.db.execute(query)
        rows = result.all()

        # Build dictionaries
        counts = {}
        user_likes = {}

        for row in rows:
            collection_id = row.collection_id
            counts[collection_id] = row.count
            user_likes[collection_id] = bool(
                row.is_liked) if user_id else False

        # Ensure all collection_ids have entries (even if 0)
        for collection_id in collection_ids:
            if collection_id not in counts:
                counts[collection_id] = 0
            if collection_id not in user_likes:
                user_likes[collection_id] = False

        return {'counts': counts, 'user_likes': user_likes}

    async def get_user_collections(self, user_id: int, page: int = 1, limit: int = 10) -> Tuple[List[Collection], int]:
        """Get user's collections with pagination and optimized relation loading (list view)."""
        try:
            from app.models.association_tables import CollectionArtist, collection_artist

            # Build base query
            query = select(Collection).filter(Collection.owner_id == user_id)

            # Get total count
            count_query = select(func.count()).select_from(query.subquery())
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            # Add subqueries for counting albums and artists (optimized for list view)
            albums_count_subq = (
                select(func.count(CollectionAlbum.album_id))
                .where(CollectionAlbum.collection_id == Collection.id)
                .scalar_subquery()
            )

            artists_count_subq = (
                select(func.count(CollectionArtist.artist_id))
                .where(CollectionArtist.collection_id == Collection.id)
                .scalar_subquery()
            )

            # Add counts to query (only for list view, not loading full relations)
            query = query.add_columns(
                albums_count_subq.label('albums_count'),
                artists_count_subq.label('artists_count')
            )

            # Apply pagination
            offset = (page - 1) * limit
            query = query.order_by(Collection.created_at.desc()).offset(
                offset).limit(limit)

            # Only preload owner (not albums/artists for list view performance)
            query = query.options(
                selectinload(Collection.owner)
            )

            result = await self.db.execute(query)
            # Handle result with counts: result is a list of tuples (Collection, albums_count, artists_count)
            rows = result.all()

            if not rows:
                return [], total

            collections = [row[0] for row in rows]

            # Attach counts to collection objects for easy access
            for collection, albums_count, artists_count in rows:
                collection.albums_count = albums_count or 0
                collection.artists_count = artists_count or 0

            return collections, total
        except SQLAlchemyError as e:
            logger.error(f"Error retrieving user collections: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to retrieve user collections",
                details={}
            )

    async def count_user_collections(self, user_id: int) -> int:
        """Count user's collections."""
        try:
            query = select(func.count(Collection.id)).where(Collection.owner_id == user_id)
            result = await self.db.execute(query)
            return result.scalar() or 0
        except SQLAlchemyError as e:
            logger.error(f"Error counting user collections: {str(e)}")
            return 0

    async def get_collection_artists_paginated(self, collection_id: int, page: int = 1, limit: int = 12, sort_order: str = "newest") -> Tuple[List[tuple], int]:
        """Get paginated artists from a collection with optimized relation loading, sorted by collection_artist.created_at."""
        try:
            # Determine sort order
            if sort_order == "oldest":
                order_clause = CollectionArtist.created_at.asc().nullslast()
            else:  # default to newest
                order_clause = CollectionArtist.created_at.desc().nullslast()

            # Query to get artists with collection_artist metadata, sorted by collection_artist.created_at
            query = (
                select(Artist, CollectionArtist)
                .join(CollectionArtist, Artist.id == CollectionArtist.artist_id)
                .filter(CollectionArtist.collection_id == collection_id)
                .options(
                    selectinload(Artist.external_source),
                )
                .order_by(order_clause)
            )

            # Get total count
            count_query = select(func.count(CollectionArtist.artist_id)).filter(
                CollectionArtist.collection_id == collection_id
            )
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            # Apply pagination
            offset = (page - 1) * limit
            query = query.offset(offset).limit(limit)

            result = await self.db.execute(query)
            artists_with_association = result.all()

            return artists_with_association, total
        except SQLAlchemyError as e:
            logger.error(
                f"Error getting collection artists paginated: {str(e)}")
            return [], 0

    async def get_collection_artists(self, collection_id: int, sort_order: str = "newest") -> List[tuple]:
        """Get all artists from a collection with association metadata (for exports)."""
        try:
            if sort_order == "oldest":
                order_clause = CollectionArtist.created_at.asc().nullslast()
            else:
                order_clause = CollectionArtist.created_at.desc().nullslast()

            query = (
                select(Artist, CollectionArtist)
                .join(CollectionArtist, Artist.id == CollectionArtist.artist_id)
                .filter(CollectionArtist.collection_id == collection_id)
                .options(
                    selectinload(Artist.external_source),
                )
                .order_by(order_clause)
            )

            result = await self.db.execute(query)
            return result.all()
        except SQLAlchemyError as e:
            logger.error(f"Error getting collection artists: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to get collection artists",
                details={},
            )

    async def search_collection_items(self, collection_id: int, query: str, search_type: str = "both") -> dict:
        """Search items in a collection. Returns (Album, CollectionAlbum) tuples for albums."""
        try:
            results = {"albums": [], "artists": []}

            if search_type in ["albums", "both"]:
                album_query = (
                    select(Album, CollectionAlbum)
                    .join(CollectionAlbum, Album.id == CollectionAlbum.album_id)
                    .options(
                        selectinload(CollectionAlbum.state_record_ref),
                        selectinload(CollectionAlbum.state_cover_ref),
                    )
                    .filter(
                        CollectionAlbum.collection_id == collection_id,
                        Album.title.ilike(f"%{query}%")
                    )
                )
                album_result = await self.db.execute(album_query)
                results["albums"] = album_result.all()

            if search_type in ["artists", "both"]:
                artist_query = (
                    select(Artist)
                    .join(CollectionArtist, Artist.id == CollectionArtist.artist_id)
                    .options(selectinload(Artist.external_source))
                    .filter(
                        CollectionArtist.collection_id == collection_id,
                        Artist.title.ilike(f"%{query}%")
                    )
                )
                artist_result = await self.db.execute(artist_query)
                results["artists"] = artist_result.scalars().all()

            return results
        except SQLAlchemyError as e:
            logger.error(f"Error searching collection items: {str(e)}")
            return {"albums": [], "artists": []}

    async def get_user_stats_all(self, user_id: int) -> dict:
        """Get collections/wishlist/likes/places counts in a single query."""
        from app.models.wishlist_model import Wishlist
        from app.models.place_model import Place

        collections_subq = (
            select(func.count(Collection.id))
            .where(Collection.owner_id == user_id)
            .scalar_subquery()
        )
        wishlist_subq = (
            select(func.count(Wishlist.id))
            .where(Wishlist.user_id == user_id)
            .scalar_subquery()
        )
        likes_subq = (
            select(func.count(Like.id))
            .where(Like.user_id == user_id)
            .scalar_subquery()
        )
        places_subq = (
            select(func.count(Place.id))
            .where(Place.submitted_by_id == user_id)
            .scalar_subquery()
        )

        query = select(
            collections_subq.label("collections_count"),
            wishlist_subq.label("wishlist_count"),
            likes_subq.label("likes_count"),
            places_subq.label("places_count"),
        )
        try:
            result = await self.db.execute(query)
            row = result.first()
            return {
                "collections_count": row.collections_count or 0,
                "wishlist_count": row.wishlist_count or 0,
                "likes_count": row.likes_count or 0,
                "places_count": row.places_count or 0,
            }
        except SQLAlchemyError as e:
            logger.error(f"Error getting user stats all for user {user_id}: {str(e)}")
            return {"collections_count": 0, "wishlist_count": 0, "likes_count": 0, "places_count": 0}

    async def refresh(self, collection: Collection) -> Collection:
        """Refresh a collection object from the database."""
        try:
            await self.db.refresh(collection)
            return collection
        except SQLAlchemyError as e:
            logger.error(
                f"Error refreshing collection {collection.id}: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to refresh collection",
                details={}
            )
