from typing import List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError, NoResultFound

import asyncio
from app.repositories.collection_repository import CollectionRepository
from app.repositories.like_repository import LikeRepository
from app.repositories.collection_album_repository import CollectionAlbumRepository
from app.repositories.wishlist_repository import WishlistRepository
from app.repositories.place_repository import PlaceRepository
from app.models.collection_model import Collection
from app.models.album_model import Album
from app.models.collection_album import CollectionAlbum
from app.models.reference_data.entity_types import EntityType
from app.models.reference_data.external_sources import ExternalSource
from app.schemas.collection_schema import (
    CollectionCreate,
    CollectionUpdate,
    CollectionResponse,
    CollectionAlbumResponse,
    CollectionArtistResponse,
    PaginatedAlbumsResponse,
    PaginatedArtistsResponse,
    CollectionSearchResponse
)
from app.schemas.collection_album_schema import (
    CollectionAlbumCreate,
    CollectionAlbumUpdate
)
from app.schemas.external_reference_schema import WishlistItemResponse
from app.schemas.user_schema import UserMiniResponse
from app.schemas.album_schema import AlbumBase
from app.core.exceptions import (
    ResourceNotFoundError,
    ForbiddenError,
    DuplicateFieldError,
    ServerError,
    ValidationError,
    ErrorCode
)
from app.core.logging import logger
from app.core.enums import EntityTypeEnum


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

    def _convert_external_source_to_dict(self, external_source: ExternalSource) -> dict:
        """Convert ExternalSource SQLAlchemy object to dict for Pydantic schema"""
        if external_source:
            return {
                "id": external_source.id,
                "name": external_source.name
            }
        return {
            "id": 0,
            "name": "UNKNOWN"
        }

    def _convert_artist_to_collection_artist_response(self, artist) -> CollectionArtistResponse:
        """Convert artist SQLAlchemy object to CollectionArtistResponse schema"""
        external_source_dict = self._convert_external_source_to_dict(
            artist.external_source if hasattr(artist, 'external_source') else None
        )
        
        return CollectionArtistResponse(
            id=artist.id,
            external_artist_id=artist.external_artist_id,
            title=artist.title,
            image_url=artist.image_url,
            external_source=external_source_dict,
            created_at=artist.created_at,
            updated_at=artist.updated_at,
            collections_count=getattr(artist, 'collections_count', 0)
        )

    def _convert_album_to_collection_album_response(self, album, collection_album=None) -> CollectionAlbumResponse:
        """Convert album SQLAlchemy object to CollectionAlbumResponse schema"""
        # Get metadata from collection_album if available
        state_record = None
        state_cover = None
        acquisition_month_year = None
        
        if collection_album:
            # Use ORM relationships to get state names
            if collection_album.state_record_ref:
                state_record = collection_album.state_record_ref.name
            if collection_album.state_cover_ref:
                state_cover = collection_album.state_cover_ref.name
            acquisition_month_year = collection_album.acquisition_month_year
        
        external_source_dict = self._convert_external_source_to_dict(
            album.external_source if hasattr(album, 'external_source') else None
        )
        
        return CollectionAlbumResponse(
            id=album.id,
            external_album_id=album.external_album_id,
            external_source_id=album.external_source_id,
            external_source=external_source_dict,
            title=album.title,
            artist=None,  # Not available in current model
            image_url=album.image_url,
            state_record=state_record,
            state_cover=state_cover,
            acquisition_month_year=acquisition_month_year,
            created_at=album.created_at,
            updated_at=album.updated_at,
            collections_count=getattr(album, 'collections_count', 0),
            loans_count=getattr(album, 'loans_count', 0),
            wishlist_count=getattr(album, 'wishlist_count', 0)
        )

    def _convert_user_to_mini_response(self, user) -> UserMiniResponse:
        """Convert user SQLAlchemy object to UserMiniResponse schema"""
        return UserMiniResponse(
            id=user.id,
            username=user.username,
            user_uuid=user.user_uuid
        )

    async def create_collection(self, collection_data: CollectionCreate, user_id: int) -> CollectionResponse:
        """Create a new collection"""
        try:
            self._validate_collection_data(collection_data)
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
            created_collection = await self.repository.refresh(created_collection)
            return await self._build_collection_response(created_collection, user_id)
        except (DuplicateFieldError, ValidationError) as e:
            raise e
        except Exception as e:
            logger.error(f"Error creating collection: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to create collection",
                details={"error": str(e)}
            )

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

    async def get_collection(self, collection_id: int) -> CollectionResponse:
        """Get a collection by ID"""
        try:
            collection = await self.repository.get_by_id(collection_id, load_relations=False)
            return await self._build_collection_response(collection)
        except NoResultFound:
            raise ResourceNotFoundError("Collection", collection_id)
        except Exception as e:
            logger.error(f"Error getting collection: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get collection",
                details={"error": str(e)}
            )

    async def update_collection(self, user_id: int, collection_id: int, collection_data: CollectionUpdate) -> CollectionResponse:
        """Update a collection"""
        try:
            # Get collection and verify ownership
            collection = await self.repository.get_by_id(collection_id)
            if not collection:
                raise ResourceNotFoundError("Collection", collection_id)
            
            if collection.owner_id != user_id:
                raise ForbiddenError(
                    error_code=4003,
                    message="You can only update your own collections",
                    details={"collection_id": collection_id}
                )
            
            # Validate update data
            self._validate_update_data(collection_data)
            
            # Update collection fields (only basic fields)
            update_data = collection_data.model_dump(exclude_unset=True)
            for field, value in update_data.items():
                setattr(collection, field, value)
            
            # Save updated collection
            updated_collection = await self.repository.update(collection)
            
            # Refresh to get updated relationships
            updated_collection = await self.repository.refresh(updated_collection)
            
            # Convert to response schema
            return await self.get_collection(collection_id)
            
        except (ResourceNotFoundError, ForbiddenError, ValidationError) as e:
            raise e
        except Exception as e:
            logger.error(f"Error updating collection: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to update collection",
                details={"error": str(e)}
            )

    async def delete_collection(self, user_id: int, collection_id: int) -> bool:
        """Delete a collection"""
        try:
            # Get collection and verify ownership
            collection = await self.repository.get_by_id(collection_id)
            if not collection:
                raise ResourceNotFoundError("Collection", collection_id)
            
            if collection.owner_id != user_id:
                raise ForbiddenError(
                    error_code=4003,
                    message="You can only delete your own collections",
                    details={"collection_id": collection_id}
                )
            
            # Delete collection
            await self.repository.delete(collection)
            return True
            
        except (ResourceNotFoundError, ForbiddenError) as e:
            raise e
        except Exception as e:
            logger.error(f"Error deleting collection: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to delete collection",
                details={"error": str(e)}
            )

    async def add_album_to_collection(self, user_id: int, collection_id: int, album_data: CollectionAlbumCreate) -> CollectionAlbumResponse:
        """Add an album to a collection"""
        try:
            # Get collection and verify ownership
            collection = await self.repository.get_by_id(collection_id)
            if not collection:
                raise ResourceNotFoundError("Collection", collection_id)
            
            if collection.owner_id != user_id:
                raise ForbiddenError(
                    error_code=4003,
                    message="You can only add albums to your own collections",
                    details={"collection_id": collection_id}
                )
            
            # Add album to collection
            collection_album = await self.collection_album_repository.add_album_to_collection(
                collection_id, album_data.album_id, album_data.model_dump(exclude={'album_id'})
            )
            
            # Get the album with metadata
            album = await self.collection_album_repository.get_album_with_metadata(collection_id, album_data.album_id)
            
            # Convert to response schema using the conversion method
            return self._convert_album_to_collection_album_response(album, collection_album)
            
        except (ResourceNotFoundError, ForbiddenError) as e:
            raise e
        except Exception as e:
            logger.error(f"Error adding album to collection: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to add album to collection",
                details={"error": str(e)}
            )

    async def update_album_metadata(self, user_id: int, collection_id: int, album_id: int, metadata: CollectionAlbumUpdate) -> CollectionAlbumResponse:
        """Update album metadata in a collection"""
        try:
            # Get collection and verify ownership
            collection = await self.repository.get_by_id(collection_id)
            if not collection:
                raise ResourceNotFoundError("Collection", collection_id)
            
            if collection.owner_id != user_id:
                raise ForbiddenError(
                    error_code=4003,
                    message="You can only update albums in your own collections",
                    details={"collection_id": collection_id}
                )
            
            # Update metadata
            updated_metadata = await self.collection_album_repository.update_album_metadata(
                collection_id, album_id, metadata.model_dump(exclude_unset=True)
            )
            
            # Get the album with updated metadata
            album = await self.collection_album_repository.get_album_with_metadata(collection_id, album_id)
            
            # Convert to response schema using the conversion method
            return self._convert_album_to_collection_album_response(album, updated_metadata)
            
        except (ResourceNotFoundError, ForbiddenError) as e:
            raise e
        except Exception as e:
            logger.error(f"Error updating album metadata: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to update album metadata",
                details={"error": str(e)}
            )

    async def remove_album_from_collection(self, user_id: int, collection_id: int, album_id: int) -> bool:
        """Remove an album from a collection"""
        try:
            # Get collection and verify ownership
            collection = await self.repository.get_by_id(collection_id)
            if not collection:
                raise ResourceNotFoundError("Collection", collection_id)
            
            if collection.owner_id != user_id:
                raise ForbiddenError(
                    error_code=4003,
                    message="You can only remove albums from your own collections",
                    details={"collection_id": collection_id}
                )
            
            # Remove album from collection
            await self.collection_album_repository.remove_album_from_collection(collection_id, album_id)
            return True
            
        except (ResourceNotFoundError, ForbiddenError) as e:
            raise e
        except Exception as e:
            logger.error(f"Error removing album from collection: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to remove album from collection",
                details={"error": str(e)}
            )

    async def remove_artist_from_collection(self, user_id: int, collection_id: int, artist_id: int) -> bool:
        """Remove an artist from a collection"""
        try:
            # Get collection and verify ownership
            collection = await self.repository.get_by_id(collection_id)
            if not collection:
                raise ResourceNotFoundError("Collection", collection_id)
            
            if collection.owner_id != user_id:
                raise ForbiddenError(
                    error_code=4003,
                    message="You can only remove artists from your own collections",
                    details={"collection_id": collection_id}
                )
            
            # Remove artist from collection
            await self.repository.remove_artist(collection, artist_id)
            return True
            
        except (ResourceNotFoundError, ForbiddenError) as e:
            raise e
        except Exception as e:
            logger.error(f"Error removing artist from collection: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to remove artist from collection",
                details={"error": str(e)}
            )

    async def get_collection_albums(self, collection_id: int) -> List[CollectionAlbumResponse]:
        """Get all albums in a collection"""
        try:
            albums = await self.collection_album_repository.get_collection_albums(collection_id)
            
            # Convert to Pydantic schemas
            album_responses = []
            for album, collection_album in albums:
                album_responses.append(self._convert_album_to_collection_album_response(album, collection_album))
            
            return album_responses
            
        except Exception as e:
            logger.error(f"Error getting collection albums: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get collection albums",
                details={"error": str(e)}
            )

    async def get_user_collections(self, user_id: int, page: int = 1, limit: int = 10) -> Tuple[List[CollectionResponse], int]:
        """Get user's collections with pagination"""
        try:
            self._validate_pagination_params(page, limit)
            collections, total = await self.repository.get_user_collections(user_id, page, limit)
            collection_responses = []
            for collection in collections:
                response = await self._build_collection_response(collection, user_id)
                collection_responses.append(response)
            return collection_responses, total
        except ValidationError as e:
            raise e
        except Exception as e:
            logger.error(f"Error getting user collections: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get user collections",
                details={"error": str(e)}
            )

    async def get_public_collections(self, page: int = 1, limit: int = 10, exclude_user_id: int = None, user_id: int = None) -> Tuple[List[CollectionResponse], int]:
        """Get public collections with pagination, filtered to only those with at least one album, artist, or wishlist item"""
        try:
            self._validate_pagination_params(page, limit)
            collections, total = await self.repository.get_public_collections(page, limit, exclude_user_id)
            
            if not collections:
                return [], 0
            
            # Get all collection IDs for batch operations
            collection_ids = [collection.id for collection in collections]
            
            # Get likes info for all collections in batch (2 queries instead of N*2)
            likes_counts, user_likes = await asyncio.gather(
                self.repository.get_collections_likes_counts(collection_ids),
                self.repository.get_user_collections_likes(user_id, collection_ids) if user_id else asyncio.sleep(0)
            )
            
            # If no user, create empty user_likes dict
            if not user_id:
                user_likes = {}
            
            collection_responses = []
            for collection in collections:
                try:
                    # Use preloaded data and batch likes info
                    response = await self._build_collection_response_optimized(
                        collection, 
                        user_id, 
                        likes_counts.get(collection.id, 0),
                        user_likes.get(collection.id, False)
                    )
                    
                    # Only include collections with at least one album, artist, or wishlist item
                    if (len(response.albums) > 0) or (len(response.artists) > 0) or (len(response.wishlist) > 0):
                        collection_responses.append(response)
                except Exception as collection_error:
                    logger.error(f"Error processing collection {collection.id}: {str(collection_error)}")
                    continue
                    
            # Adjust total for pagination (actual number after filtering)
            filtered_total = len(collection_responses)
            return collection_responses, filtered_total
        except ValidationError as e:
            raise e
        except Exception as e:
            logger.error(f"Error getting public collections: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get public collections",
                details={"error": str(e)}
            )

    async def like_collection(self, user_id: int, collection_id: int) -> dict:
        """Like a collection"""
        try:
            # Check if collection exists
            collection = await self.repository.get_by_id(collection_id)
            if not collection:
                raise ResourceNotFoundError("Collection", collection_id)
            
            # Check if user already liked the collection
            if await self.like_repository.is_liked_by_user(collection_id, user_id):
                raise DuplicateFieldError(
                    field="like",
                    value=f"collection_{collection_id}_user_{user_id}"
                )
            
            # Like the collection
            await self.like_repository.create_like(user_id, collection_id)
            
            # Get updated likes count
            likes_count = await self.like_repository.count_likes(collection_id)
            
            return {
                "message": "Collection liked successfully",
                "likes_count": likes_count,
                "is_liked": True
            }
            
        except (ResourceNotFoundError, DuplicateFieldError) as e:
            raise e
        except Exception as e:
            logger.error(f"Error liking collection: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to like collection",
                details={"error": str(e)}
            )

    async def unlike_collection(self, user_id: int, collection_id: int) -> dict:
        """Unlike a collection"""
        try:
            # Check if collection exists
            collection = await self.repository.get_by_id(collection_id)
            if not collection:
                raise ResourceNotFoundError("Collection", collection_id)
            
            # Check if user liked the collection
            if not await self.like_repository.is_liked_by_user(collection_id, user_id):
                raise ResourceNotFoundError("Like", f"collection_{collection_id}_user_{user_id}")
            
            # Unlike the collection
            await self.like_repository.remove(user_id, collection_id)
            
            # Get updated likes count
            likes_count = await self.like_repository.count_likes(collection_id)
            
            return {
                "message": "Collection unliked successfully",
                "likes_count": likes_count,
                "is_liked": False
            }
            
        except ResourceNotFoundError as e:
            raise e
        except Exception as e:
            logger.error(f"Error unliking collection: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to unlike collection",
                details={"error": str(e)}
            )

    async def get_collection_likes(self, collection_id: int) -> int:
        """Get the number of likes for a collection"""
        try:
            return await self.like_repository.count_likes(collection_id)
        except Exception as e:
            logger.error(f"Error getting collection likes: {str(e)}")
            return 0

    def _validate_collection_data(self, data: CollectionCreate) -> None:
        """Validate collection creation data"""
        if not data.name or len(data.name.strip()) == 0:
            raise ValidationError(
                error_code=4000,
                message="Collection name cannot be empty",
                details={"field": "name"}
            )

    def _validate_update_data(self, data: CollectionUpdate) -> None:
        """Validate collection update data"""
        if data.name is not None and len(data.name.strip()) == 0:
            raise ValidationError(
                error_code=4000,
                message="Collection name cannot be empty",
                details={"field": "name"}
            )

    def _validate_pagination_params(self, page: int, limit: int) -> None:
        """Validate pagination parameters"""
        if page < 1:
            raise ValidationError(
                error_code=4000,
                message="Page number must be greater than 0",
                details={"field": "page", "value": page}
            )
        if limit < 1 or limit > 100:
            raise ValidationError(
                error_code=4000,
                message="Limit must be between 1 and 100",
                details={"field": "limit", "value": limit}
            )

    async def get_collection_by_id(self, collection_id: int, user_id: int) -> CollectionResponse:
        """Get a collection by ID with proper access control"""
        try:
            collection = await self.repository.get_by_id(collection_id, load_relations=False)
            if not collection:
                raise ResourceNotFoundError("Collection", collection_id)
            if not collection.is_public and collection.owner_id != user_id:
                raise ForbiddenError(
                    error_code=4003,
                    message="You don't have permission to view this collection",
                    details={"collection_id": collection_id}
                )
            return await self._build_collection_response(collection, user_id)
        except (ResourceNotFoundError, ForbiddenError, ValidationError) as e:
            raise e
        except Exception as e:
            logger.error(f"Error getting collection by ID: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get collection",
                details={"error": str(e)}
            )

    async def get_collection_albums_paginated(self, collection_id: int, user_id: int, page: int = 1, limit: int = 12) -> PaginatedAlbumsResponse:
        """Get paginated albums from a collection"""
        try:
            # Validate pagination parameters
            self._validate_pagination_params(page, limit)
            
            # Get collection and verify access
            collection = await self.repository.get_by_id(collection_id)
            if not collection:
                raise ResourceNotFoundError("Collection", collection_id)
            
            if not collection.is_public and collection.owner_id != user_id:
                raise ForbiddenError(
                    error_code=4003,
                    message="You don't have permission to view this collection",
                    details={"collection_id": collection_id}
                )
            
            # Get paginated albums
            albums_data, total = await self.collection_album_repository.get_collection_albums_paginated(
                collection_id, page, limit
            )
            
            # Convert to Pydantic schemas
            album_responses = []
            for album, collection_album in albums_data:
                album_responses.append(self._convert_album_to_collection_album_response(album, collection_album))
            
            # Calculate total pages
            total_pages = (total + limit - 1) // limit
            
            # Create paginated response using Pydantic schema
            response = PaginatedAlbumsResponse(
                items=album_responses,
                total=total,
                page=page,
                limit=limit,
                total_pages=total_pages
            )
            
            return response
            
        except (ResourceNotFoundError, ForbiddenError, ValidationError) as e:
            raise e
        except Exception as e:
            logger.error(f"Error getting collection albums paginated: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get collection albums",
                details={"error": str(e)}
            )

    async def get_collection_artists_paginated(self, collection_id: int, user_id: int, page: int = 1, limit: int = 12) -> PaginatedArtistsResponse:
        """Get paginated artists from a collection"""
        try:
            # Validate pagination parameters
            self._validate_pagination_params(page, limit)
            
            # Get collection and verify access
            collection = await self.repository.get_by_id(collection_id)
            if not collection:
                raise ResourceNotFoundError("Collection", collection_id)
            
            if not collection.is_public and collection.owner_id != user_id:
                raise ForbiddenError(
                    error_code=4003,
                    message="You don't have permission to view this collection",
                    details={"collection_id": collection_id}
                )
            
            # Get paginated artists
            artists, total = await self.repository.get_collection_artists_paginated(collection_id, page, limit)
            
            # Convert to Pydantic schemas
            artist_responses = []
            for artist in artists:
                artist_responses.append(self._convert_artist_to_collection_artist_response(artist))
            
            # Calculate total pages
            total_pages = (total + limit - 1) // limit
            
            # Create paginated response using Pydantic schema
            response = PaginatedArtistsResponse(
                items=artist_responses,
                total=total,
                page=page,
                limit=limit,
                total_pages=total_pages
            )
            
            return response
            
        except (ResourceNotFoundError, ForbiddenError, ValidationError) as e:
            raise e
        except Exception as e:
            logger.error(f"Error getting collection artists paginated: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get collection artists",
                details={"error": str(e)}
            )

    async def search_collection_items(self, collection_id: int, user_id: int, query: str, search_type: str = "both") -> dict:
        """Search for items in a collection"""
        try:
            # Get collection and verify access
            collection = await self.repository.get_by_id(collection_id)
            if not collection:
                raise ResourceNotFoundError("Collection", collection_id)
            
            if not collection.is_public and collection.owner_id != user_id:
                raise ForbiddenError(
                    error_code=4003,
                    message="You don't have permission to search this collection",
                    details={"collection_id": collection_id}
                )
            
            # Validate search type and normalize to plural form
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
            
            # Normalize to plural form for internal processing
            normalized_search_type = search_type_mapping[search_type]
            
            # Perform search
            results = await self.repository.search_collection_items(collection_id, query, normalized_search_type)
            
            # Convert results to Pydantic schemas
            albums = []
            artists = []
            
            if "albums" in results:
                for album in results["albums"]:
                    # Get collection album metadata for this album
                    collection_album = await self.collection_album_repository.get_collection_album_metadata(collection_id, album.id)
                    albums.append(self._convert_album_to_collection_album_response(album, collection_album))
            
            if "artists" in results:
                for artist in results["artists"]:
                    artists.append(self._convert_artist_to_collection_artist_response(artist))
            
            # Create response using Pydantic schema
            response = CollectionSearchResponse(
                albums=albums,
                artists=artists,
                query=query,
                search_type=search_type
            )
            
            return response.model_dump()
            
        except (ResourceNotFoundError, ForbiddenError, ValidationError) as e:
            raise e
        except Exception as e:
            logger.error(f"Error searching collection items: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to search collection items",
                details={"error": str(e)}
            )

    async def _build_collection_response(self, collection, user_id=None) -> CollectionResponse:
        """Helper to build a CollectionResponse from a Collection instance."""
        # Load artists
        artists = []
        artists_data, _ = await self.repository.get_collection_artists_paginated(collection.id, 1, 1000)
        for artist in artists_data:
            artists.append(self._convert_artist_to_collection_artist_response(artist))

        # Load albums
        albums = []
        albums_data = await self.collection_album_repository.get_collection_albums(collection.id)
        for album, collection_album in albums_data:
            albums.append(self._convert_album_to_collection_album_response(album, collection_album))

        # Owner
        owner = None
        if hasattr(collection, 'owner') and collection.owner:
            owner = self._convert_user_to_mini_response(collection.owner)

        # Likes
        likes_count = await self.like_repository.count_likes(collection.id)
        is_liked = False
        if user_id is not None:
            is_liked = await self.like_repository.is_liked_by_user(collection.id, user_id)
        elif hasattr(collection, 'owner_id'):
            is_liked = await self.like_repository.is_liked_by_user(collection.id, collection.owner_id)

        # Wishlist (pour le owner)
        wishlist_items = await self.wishlist_repository.get_by_user_id(collection.owner_id)
        wishlist = []
        for item in wishlist_items:
            try:
                item_dict = item.__dict__.copy()
                # Robust mapping for entity_type
                entity_type_str = None
                if hasattr(item, 'entity_type') and item.entity_type is not None:
                    entity_type = item.entity_type
                    if hasattr(entity_type, 'value'):
                        entity_type_str = entity_type.value
                    elif hasattr(entity_type, 'name'):
                        entity_type_str = entity_type.name.lower()
                    else:
                        entity_type_str = str(entity_type).lower()
                elif hasattr(item, 'entity_type_id') and item.entity_type_id:
                    # Fallback: map id to enum
                    try:
                        if item.entity_type_id == 1:
                            entity_type_str = EntityTypeEnum.ALBUM.value
                        elif item.entity_type_id == 2:
                            entity_type_str = EntityTypeEnum.ARTIST.value
                    except Exception:
                        entity_type_str = None
                item_dict['entity_type'] = entity_type_str
                wishlist.append(WishlistItemResponse.model_validate(item_dict))
            except Exception as e:
                logger.error(f"Error processing wishlist item {getattr(item, 'id', '?')}: {str(e)}")
                continue

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
            wishlist=wishlist
            )

    async def _build_collection_response_optimized(self, collection, user_id=None, likes_count=None, is_liked=None) -> CollectionResponse:
        """Optimized version that uses preloaded data and pre-fetched likes info."""
        # Use preloaded artists and albums (no additional queries)
        artists = []
        if hasattr(collection, 'artists') and collection.artists:
            for artist in collection.artists:
                artists.append(self._convert_artist_to_collection_artist_response(artist))

        albums = []
        if hasattr(collection, 'collection_albums') and collection.collection_albums:
            for collection_album in collection.collection_albums:
                if hasattr(collection_album, 'album') and collection_album.album:
                    albums.append(self._convert_album_to_collection_album_response(collection_album.album, collection_album))

        # Owner (preloaded)
        owner = None
        if hasattr(collection, 'owner') and collection.owner:
            owner = self._convert_user_to_mini_response(collection.owner)

        # Use pre-fetched likes info
        if likes_count is None:
            likes_count = await self.like_repository.count_likes(collection.id)
        if is_liked is None and user_id is not None:
            is_liked = await self.like_repository.is_liked_by_user(collection.id, user_id)
        elif is_liked is None:
            is_liked = False

        # Wishlist (pour le owner) - still need to query this
        wishlist_items = await self.wishlist_repository.get_by_user_id(collection.owner_id)
        wishlist = []
        for item in wishlist_items:
            try:
                item_dict = item.__dict__.copy()
                # Robust mapping for entity_type
                entity_type_str = None
                if hasattr(item, 'entity_type') and item.entity_type is not None:
                    entity_type = item.entity_type
                    if hasattr(entity_type, 'value'):
                        entity_type_str = entity_type.value
                    elif hasattr(entity_type, 'name'):
                        entity_type_str = entity_type.name.lower()
                    else:
                        entity_type_str = str(entity_type).lower()
                elif hasattr(item, 'entity_type_id') and item.entity_type_id:
                    # Fallback: map id to enum
                    try:
                        if item.entity_type_id == 1:
                            entity_type_str = EntityTypeEnum.ALBUM.value
                        elif item.entity_type_id == 2:
                            entity_type_str = EntityTypeEnum.ARTIST.value
                    except Exception:
                        entity_type_str = None
                item_dict['entity_type'] = entity_type_str
                wishlist.append(WishlistItemResponse.model_validate(item_dict))
            except Exception as e:
                logger.error(f"Error processing wishlist item {getattr(item, 'id', '?')}: {str(e)}")
                continue

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
            wishlist=wishlist
        )
