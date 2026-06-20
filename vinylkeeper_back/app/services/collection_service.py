from typing import List, Tuple
from sqlalchemy.exc import IntegrityError

from app.repositories.collection_repository import CollectionRepository
from app.repositories.like_repository import LikeRepository
from app.repositories.collection_album_repository import CollectionAlbumRepository
from app.repositories.wishlist_repository import WishlistRepository
from app.repositories.place_repository import PlaceRepository
from app.models.collection_model import Collection
from app.mappers import collection_mapper
from app.schemas.collection_schema import (
    CollectionCreate,
    CollectionUpdate,
    CollectionResponse,
    CollectionListItemResponse,
    CollectionDetailResponse,
    CollectionAlbumResponse,
    PaginatedAlbumsResponse,
    PaginatedArtistsResponse,
    CollectionSearchResponse
)
from app.schemas.collection_album_schema import (
    CollectionAlbumCreate,
    CollectionAlbumUpdate
)
from app.core.exceptions import (
    AppException,
    ResourceNotFoundError,
    ForbiddenError,
    DuplicateFieldError,
    DuplicateCollectionNameError,
    ServerError,
    ValidationError,
    ErrorCode
)
from app.core.logging import logger
from app.core.transaction import transaction_context


class CollectionService:
    """Service for managing collections"""

    def __init__(
        self,
        repository: CollectionRepository,
        like_repository: LikeRepository,
        collection_album_repository: CollectionAlbumRepository,
        wishlist_repository: WishlistRepository,
        place_repository: PlaceRepository
    ):
        self.repository = repository
        self.like_repository = like_repository
        self.collection_album_repository = collection_album_repository
        self.wishlist_repository = wishlist_repository
        self.place_repository = place_repository

    async def _get_owned_collection(self, user_id: int, collection_id: int) -> Collection:
        collection = await self.repository.get_by_id(collection_id)
        if not collection:
            raise ResourceNotFoundError("Collection", collection_id)
        if collection.owner_id != user_id:
            raise ForbiddenError(
                error_code=ErrorCode.FORBIDDEN_OWNER,
                message="You don't own this collection",
                details={"collection_id": collection_id}
            )
        return collection

    def _assert_collection_accessible(self, collection: Collection, user_id: int) -> None:
        if not collection.is_public and collection.owner_id != user_id:
            raise ForbiddenError(
                error_code=ErrorCode.FORBIDDEN_OWNER,
                message="You don't have permission to view this collection",
                details={"collection_id": collection.id}
            )

    async def create_collection(self, collection_data: CollectionCreate, user_id: int) -> CollectionResponse:
        """Create a new collection. Transaction is managed here; safe to call inside an outer transaction."""
        async with transaction_context(self.repository.db):
            existing_collection = await self.repository.find_by_name_and_owner(collection_data.name, user_id)
            if existing_collection:
                raise DuplicateCollectionNameError(collection_data.name)

            collection = Collection(
                name=collection_data.name,
                description=collection_data.description,
                is_public=collection_data.is_public,
                mood_id=collection_data.mood_id,
                owner_id=user_id
            )
            created_collection = await self.repository.create(collection)
            created_collection = await self.repository.refresh(created_collection)

            if collection_data.album_ids:
                await self.repository.add_albums(created_collection, collection_data.album_ids)
            if collection_data.artist_ids:
                await self.repository.add_artists(created_collection, collection_data.artist_ids)

            created_collection = await self.repository.get_by_id(created_collection.id, load_relations=True)
            return await self._build_collection_response(created_collection, user_id)

    async def get_user_collections_count(self, user_id: int) -> int:
        """Get count of user's collections"""
        try:
            return await self.repository.count_user_collections(user_id)
        except Exception as e:
            logger.error(f"Error getting user collections count: {str(e)}")
            return 0

    async def get_user_wishlist_count(self, user_id: int) -> int:
        """Get count of user's wishlist items"""
        try:
            return await self.wishlist_repository.count_user_wishlist_items(user_id)
        except Exception as e:
            logger.error(f"Error getting user wishlist count: {str(e)}")
            return 0

    async def get_user_likes_count(self, user_id: int) -> int:
        """Get count of user's likes"""
        try:
            return await self.like_repository.count_user_likes(user_id)
        except Exception as e:
            logger.error(f"Error getting user likes count: {str(e)}")
            return 0

    async def get_user_places_count(self, user_id: int) -> int:
        """Get count of user's places"""
        try:
            return await self.place_repository.count_places_by_user(user_id)
        except Exception as e:
            logger.error(f"Error getting user places count: {str(e)}")
            return 0

    async def get_user_me_counts(self, user_id: int) -> dict:
        """Get only counts needed for /me endpoint (optimized - only collections)"""
        try:
            collections_count = await self.get_user_collections_count(user_id)

            return {
                "collections_count": collections_count
            }
        except Exception as e:
            logger.error(
                f"Error getting user me counts for user {user_id}: {str(e)}")
            return {
                "collections_count": 0
            }

    async def get_user_counts_batch(self, user_id: int) -> dict:
        """Get all user counts in a single SQL query."""
        return await self.repository.get_user_stats_all(user_id)

    async def get_collection(self, collection_id: int) -> CollectionResponse:
        """Get a collection by ID"""
        collection = await self.repository.get_by_id(collection_id, load_relations=True)
        return await self._build_collection_response(collection)

    async def update_collection(
        self, user_id: int, collection_id: int, collection_data: CollectionUpdate
    ) -> CollectionResponse:
        """Update a collection"""
        async with transaction_context(self.repository.db):
            collection = await self._get_owned_collection(user_id, collection_id)
            if collection_data.name is not None and collection_data.name != collection.name:
                existing_collection = await self.repository.find_by_name_and_owner(collection_data.name, user_id)
                if existing_collection and existing_collection.id != collection_id:
                    raise DuplicateCollectionNameError(collection_data.name)

            update_data = collection_data.model_dump(exclude_unset=True)
            for field, value in update_data.items():
                setattr(collection, field, value)

            updated_collection = await self.repository.update(collection)
            await self.repository.refresh(updated_collection)

        return await self.get_collection(collection_id)

    async def delete_collection(self, user_id: int, collection_id: int) -> bool:
        """Delete a collection"""
        async with transaction_context(self.repository.db):
            collection = await self._get_owned_collection(user_id, collection_id)
            await self.repository.delete(collection)
        return True

    async def add_album_to_collection(
        self, user_id: int, collection_id: int, album_data: CollectionAlbumCreate
    ) -> CollectionAlbumResponse:
        """Add an album to a collection"""
        async with transaction_context(self.collection_album_repository.db):
            await self._get_owned_collection(user_id, collection_id)
            collection_album = await self.collection_album_repository.add_album_to_collection(
                collection_id, album_data.album_id, album_data.model_dump(exclude={'album_id'})
            )

        album = await self.collection_album_repository.get_album_with_metadata(collection_id, album_data.album_id)
        return collection_mapper.album_to_collection_album_response(album, collection_album)

    async def update_album_metadata(
        self, user_id: int, collection_id: int, album_id: int, metadata: CollectionAlbumUpdate
    ) -> CollectionAlbumResponse:
        """Update album metadata in a collection"""
        async with transaction_context(self.collection_album_repository.db):
            await self._get_owned_collection(user_id, collection_id)
            updated_metadata = await self.collection_album_repository.update_album_metadata(
                collection_id, album_id, metadata.model_dump(exclude_unset=True)
            )

        album = await self.collection_album_repository.get_album_with_metadata(collection_id, album_id)
        return collection_mapper.album_to_collection_album_response(album, updated_metadata)

    async def remove_album_from_collection(self, user_id: int, collection_id: int, album_id: int) -> bool:
        """Remove an album from a collection"""
        async with transaction_context(self.collection_album_repository.db):
            await self._get_owned_collection(user_id, collection_id)
            await self.collection_album_repository.remove_album_from_collection(collection_id, album_id)
        return True

    async def remove_artist_from_collection(self, user_id: int, collection_id: int, artist_id: int) -> bool:
        """Remove an artist from a collection"""
        async with transaction_context(self.repository.db):
            collection = await self._get_owned_collection(user_id, collection_id)
            await self.repository.remove_artist(collection, artist_id)
        return True

    async def get_collection_albums(self, collection_id: int) -> List[CollectionAlbumResponse]:
        """Get all albums in a collection"""
        try:
            albums = await self.collection_album_repository.get_collection_albums(collection_id)

            return [
                collection_mapper.album_to_collection_album_response(album, collection_album)
                for album, collection_album in albums
            ]

        except AppException:
            raise
        except Exception as e:
            logger.error(f"Error getting collection albums: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to get collection albums",
                details={}
            )

    async def get_user_collections(
        self, user_id: int, page: int = 1, limit: int = 10
    ) -> Tuple[List[CollectionListItemResponse], int]:
        """Get user's collections with pagination (optimized list view, lightweight response)."""
        try:
            collections, total = await self.repository.get_user_collections(user_id, page, limit)

            if not collections:
                return [], total

            collection_ids = [collection.id for collection in collections]

            likes_info = await self.repository.get_collections_likes_info_batch(user_id, collection_ids)
            likes_counts = likes_info['counts']
            user_likes = likes_info['user_likes']

            collection_responses = []
            for collection in collections:
                try:
                    response = self._build_collection_list_item(
                        collection,
                        user_id,
                        likes_counts.get(collection.id, 0),
                        user_likes.get(collection.id, False),
                        collection.albums_count,
                        collection.artists_count,
                    )
                    collection_responses.append(response)
                except Exception as collection_error:
                    logger.error(
                        f"Error processing collection {collection.id}: {str(collection_error)}")
                    continue

            return collection_responses, total
        except ValidationError as e:
            raise e
        except AppException:
            raise
        except Exception as e:
            logger.error(f"Error getting user collections: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to get user collections",
                details={}
            )

    async def get_public_collections(
        self,
        page: int = 1,
        limit: int = 10,
        exclude_user_id: int = None,
        user_id: int = None,
        sort_by: str = "updated_at"
    ) -> Tuple[List[CollectionListItemResponse], int]:
        """Get public collections with pagination (optimized list view, lightweight response)."""
        try:
            collections, total = await self.repository.get_public_collections(page, limit, exclude_user_id, sort_by)

            if not collections:
                return [], 0

            collection_ids = [collection.id for collection in collections]
            likes_info = await self.repository.get_collections_likes_info_batch(user_id, collection_ids)
            likes_counts = likes_info['counts']
            user_likes = likes_info['user_likes']

            collection_responses = []
            for collection in collections:
                try:
                    response = self._build_collection_list_item(
                        collection,
                        user_id,
                        likes_counts.get(collection.id, 0),
                        user_likes.get(collection.id, False),
                        collection.albums_count,
                        collection.artists_count,
                    )
                    collection_responses.append(response)
                except Exception as collection_error:
                    logger.error(
                        f"Error processing collection {collection.id}: {str(collection_error)}")
                    continue

            return collection_responses, total
        except ValidationError as e:
            raise e
        except AppException:
            raise
        except Exception as e:
            logger.error(f"Error getting public collections: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to get public collections",
                details={}
            )

    async def like_collection(self, user_id: int, collection_id: int) -> dict:
        """Like a collection"""
        collection = await self.repository.get_by_id(collection_id)
        if not collection:
            raise ResourceNotFoundError("Collection", collection_id)

        if await self.like_repository.is_liked_by_user(collection_id, user_id):
            raise DuplicateFieldError(
                field="like",
                value=f"collection_{collection_id}_user_{user_id}"
            )

        try:
            async with transaction_context(self.repository.db):
                await self.like_repository.create_like(user_id, collection_id)
        except IntegrityError:
            raise DuplicateFieldError(
                field="like",
                value=f"collection_{collection_id}_user_{user_id}"
            )

        likes_count = await self.like_repository.count_likes(collection_id)
        return {
            "message": "Collection liked successfully",
            "likes_count": likes_count,
            "is_liked": True
        }

    async def unlike_collection(self, user_id: int, collection_id: int) -> dict:
        """Unlike a collection"""
        collection = await self.repository.get_by_id(collection_id)
        if not collection:
            raise ResourceNotFoundError("Collection", collection_id)

        if not await self.like_repository.is_liked_by_user(collection_id, user_id):
            raise ResourceNotFoundError("Like", f"collection_{collection_id}_user_{user_id}")

        async with transaction_context(self.repository.db):
            await self.like_repository.remove(user_id, collection_id)

        likes_count = await self.like_repository.count_likes(collection_id)
        return {
            "message": "Collection unliked successfully",
            "likes_count": likes_count,
            "is_liked": False
        }

    async def get_collection_likes(self, collection_id: int) -> int:
        """Get the number of likes for a collection"""
        try:
            return await self.like_repository.count_likes(collection_id)
        except Exception as e:
            logger.error(f"Error getting collection likes: {str(e)}")
            return 0

    async def get_collection_by_id(self, collection_id: int, user_id: int) -> CollectionResponse:
        """Get a collection by ID with proper access control"""
        try:
            collection = await self.repository.get_by_id(collection_id, load_relations=True)
            if not collection:
                raise ResourceNotFoundError("Collection", collection_id)
            self._assert_collection_accessible(collection, user_id)
            return await self._build_collection_response(collection, user_id)
        except (ResourceNotFoundError, ForbiddenError, ValidationError) as e:
            raise e
        except AppException:
            raise
        except Exception as e:
            logger.error(f"Error getting collection by ID: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to get collection",
                details={}
            )

    async def get_collection_details_lightweight(self, collection_id: int, user_id: int) -> CollectionDetailResponse:
        """
        Get lightweight collection details (optimized - no albums/artists loaded).
        Uses aggregated queries for counts and likes.
        """
        try:
            # Load collection with minimal relations (only owner, no albums/artists/likes)
            collection = await self.repository.get_by_id(collection_id, load_relations=False, load_minimal=True)
            if not collection:
                raise ResourceNotFoundError("Collection", collection_id)

            self._assert_collection_accessible(collection, user_id)

            likes_info = await self.like_repository.get_likes_info(collection_id, user_id)

            owner = None
            owner_uuid = None
            if hasattr(collection, 'owner') and collection.owner:
                owner = collection_mapper.user_to_mini_response(collection.owner)
                owner_uuid = collection.owner.user_uuid

            return CollectionDetailResponse(
                id=collection.id,
                name=collection.name,
                description=collection.description,
                is_public=collection.is_public,
                mood_id=collection.mood_id,
                owner_uuid=owner_uuid,
                owner=owner,
                likes_count=likes_info["count"],
                is_liked_by_user=likes_info["is_liked"],
                created_at=collection.created_at,
                updated_at=collection.updated_at
            )
        except (ResourceNotFoundError, ForbiddenError, ValidationError) as e:
            raise e
        except AppException:
            raise
        except Exception as e:
            logger.error(
                f"Error getting collection details lightweight: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to get collection details",
                details={}
            )

    async def get_collection_albums_paginated(
        self, collection_id: int, user_id: int, page: int = 1, limit: int = 12, sort_order: str = "newest"
    ) -> PaginatedAlbumsResponse:
        """Get paginated albums from a collection"""
        try:
            collection = await self.repository.get_by_id(collection_id)
            if not collection:
                raise ResourceNotFoundError("Collection", collection_id)

            self._assert_collection_accessible(collection, user_id)

            albums_data, total = await self.collection_album_repository.get_collection_albums_paginated(
                collection_id, page, limit, sort_order
            )

            album_responses = [
                collection_mapper.album_to_collection_album_response(album, collection_album)
                for album, collection_album in albums_data
            ]

            return PaginatedAlbumsResponse(
                items=album_responses,
                total=total,
                page=page,
                limit=limit,
                total_pages=(total + limit - 1) // limit,
            )

        except (ResourceNotFoundError, ForbiddenError, ValidationError) as e:
            raise e
        except AppException:
            raise
        except Exception as e:
            logger.error(
                f"Error getting collection albums paginated: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to get collection albums",
                details={}
            )

    async def get_collection_artists_paginated(
        self, collection_id: int, user_id: int, page: int = 1, limit: int = 12, sort_order: str = "newest"
    ) -> PaginatedArtistsResponse:
        """Get paginated artists from a collection"""
        try:
            collection = await self.repository.get_by_id(collection_id)
            if not collection:
                raise ResourceNotFoundError("Collection", collection_id)

            self._assert_collection_accessible(collection, user_id)

            artists_data, total = await self.repository.get_collection_artists_paginated(
                collection_id, page, limit, sort_order
            )

            artist_responses = [
                collection_mapper.artist_to_collection_artist_response(artist, collection_artist)
                for artist, collection_artist in artists_data
            ]

            return PaginatedArtistsResponse(
                items=artist_responses,
                total=total,
                page=page,
                limit=limit,
                total_pages=(total + limit - 1) // limit,
            )

        except (ResourceNotFoundError, ForbiddenError, ValidationError) as e:
            raise e
        except AppException:
            raise
        except Exception as e:
            logger.error(
                f"Error getting collection artists paginated: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to get collection artists",
                details={}
            )

    async def search_collection_items(
        self, collection_id: int, user_id: int, query: str, search_type: str = "both"
    ) -> dict:
        """Search for items in a collection"""
        try:
            collection = await self.repository.get_by_id(collection_id)
            if not collection:
                raise ResourceNotFoundError("Collection", collection_id)

            self._assert_collection_accessible(collection, user_id)

            search_type_mapping = {
                "album": "albums",
                "artist": "artists",
                "albums": "albums",
                "artists": "artists",
                "both": "both"
            }

            if search_type not in search_type_mapping:
                raise ValidationError(
                    error_code=4000,
                    message="Search type must be 'album', 'artist', 'albums', 'artists', or 'both'",
                    details={"field": "search_type", "value": search_type}
                )

            normalized_search_type = search_type_mapping[search_type]

            results = await self.repository.search_collection_items(collection_id, query, normalized_search_type)

            albums = []
            artists = []

            if "albums" in results:
                for album, collection_album in results["albums"]:
                    albums.append(collection_mapper.album_to_collection_album_response(album, collection_album))

            if "artists" in results:
                for artist in results["artists"]:
                    artists.append(collection_mapper.artist_to_collection_artist_response(artist))

            return CollectionSearchResponse(
                albums=albums,
                artists=artists,
                query=query,
                search_type=search_type,
            )

        except (ResourceNotFoundError, ForbiddenError, ValidationError) as e:
            raise e
        except AppException:
            raise
        except Exception as e:
            logger.error(f"Error searching collection items: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to search collection items",
                details={}
            )

    async def _build_collection_response(
        self, collection, user_id=None, likes_count=None, is_liked=None
    ) -> CollectionResponse:
        """Build a CollectionResponse from a Collection instance using preloaded data."""
        artists = []
        if hasattr(collection, 'collection_artists') and collection.collection_artists:
            for collection_artist in collection.collection_artists:
                if hasattr(collection_artist, 'artist') and collection_artist.artist:
                    artists.append(
                        collection_mapper.artist_to_collection_artist_response(
                            collection_artist.artist, collection_artist
                        )
                    )

        albums = []
        if hasattr(collection, 'collection_albums') and collection.collection_albums:
            for collection_album in collection.collection_albums:
                if hasattr(collection_album, 'album') and collection_album.album:
                    albums.append(collection_mapper.album_to_collection_album_response(
                        collection_album.album, collection_album))

        owner = None
        if hasattr(collection, 'owner') and collection.owner:
            owner = collection_mapper.user_to_mini_response(collection.owner)

        if likes_count is None:
            likes_count = await self.like_repository.count_likes(collection.id)
        if is_liked is None and user_id is not None:
            is_liked = await self.like_repository.is_liked_by_user(collection.id, user_id)
        elif is_liked is None:
            is_liked = False

        return CollectionResponse(
            id=collection.id,
            name=collection.name,
            description=collection.description,
            is_public=collection.is_public,
            mood_id=collection.mood_id,
            owner_id=collection.owner_id,
            created_at=collection.created_at,
            updated_at=collection.updated_at,
            owner=owner,
            albums=albums,
            artists=artists,
            likes_count=likes_count,
            is_liked_by_user=is_liked,
        )

    def _build_collection_list_item(
        self, collection, user_id=None, likes_count=None, is_liked=None, albums_count=0, artists_count=0
    ) -> CollectionListItemResponse:
        """Build lightweight collection list item response."""
        owner = None
        if hasattr(collection, 'owner') and collection.owner:
            owner = collection_mapper.user_to_mini_response(collection.owner)

        if likes_count is None:
            likes_count = 0
        if is_liked is None:
            is_liked = False

        return CollectionListItemResponse(
            id=collection.id,
            name=collection.name,
            description=collection.description,
            is_public=collection.is_public,
            mood_id=collection.mood_id,
            owner=owner,
            likes_count=likes_count,
            is_liked_by_user=is_liked,
            albums_count=albums_count,
            artists_count=artists_count,
            created_at=collection.created_at,
            updated_at=collection.updated_at,
            image_preview=None
        )

    async def has_public_collections(self, user_id: int) -> bool:
        """Return True if the user has at least one public collection."""
        return await self.repository.count_public_by_owner(user_id) > 0
