from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, NoResultFound
from app.repositories.collection_repository import CollectionRepository
from app.repositories.like_repository import LikeRepository
from app.repositories.collection_album_repository import CollectionAlbumRepository
from app.repositories.wishlist_repository import WishlistRepository
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
    PaginatedArtistsResponse
)
from app.schemas.collection_album_schema import (
    CollectionAlbumCreate,
    CollectionAlbumUpdate,
    CollectionAlbumMetadataResponse
)
from app.core.exceptions import (
    ResourceNotFoundError,
    ForbiddenError,
    DuplicateFieldError,
    ServerError,
    ValidationError,
    ErrorCode
)
from app.core.logging import logger


class CollectionService:
    """Service for managing collections"""

    def __init__(
        self,
        repository: CollectionRepository,
        like_repository: LikeRepository,
        collection_album_repository: CollectionAlbumRepository,
        wishlist_repository: WishlistRepository
    ):
        self.repository = repository
        self.like_repository = like_repository
        self.collection_album_repository = collection_album_repository
        self.wishlist_repository = wishlist_repository

    def create_collection(self, collection_data: CollectionCreate, user_id: int) -> CollectionResponse:
        """Create a new collection"""
        try:
            # Validate collection data
            self._validate_collection_data(collection_data)
            
            # Create collection
            collection = Collection(
                name=collection_data.name,
                description=collection_data.description,
                is_public=collection_data.is_public,
                mood_id=collection_data.mood_id,
                owner_id=user_id
            )
            
            # Save to database
            created_collection = self.repository.create(collection)
            
            # Force load relationships
            self.repository.db.refresh(created_collection)
            
            # Add albums if provided
            if collection_data.album_ids:
                self.repository.add_albums(created_collection, collection_data.album_ids)
            
            # Add artists if provided
            if collection_data.artist_ids:
                self.repository.add_artists(created_collection, collection_data.artist_ids)
            
            # Load all relationships
            self.repository.db.refresh(created_collection)
            
            # Get likes info for the new collection
            likes_count = self.like_repository.count_likes(created_collection.id)
            is_liked = False  # New collection, so not liked by anyone yet
            
            # Create response with all data
            response = CollectionResponse.model_validate(created_collection)
            response.likes_count = likes_count
            response.is_liked_by_user = is_liked
            
            return response
        except (DuplicateFieldError, ValidationError) as e:
            raise e
        except Exception as e:
            logger.error(f"Error creating collection: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to create collection",
                details={"error": str(e)}
            )

    def get_collection(self, collection_id: int) -> CollectionResponse:
        """Get a collection by ID"""
        try:
            collection = self.repository.get_by_id(collection_id, load_relations=True)
            return CollectionResponse.model_validate(collection)
        except ResourceNotFoundError:
            raise
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to get collection",
                details={"error": str(e)}
            )

    def update_collection(self, user_id: int, collection_id: int, collection_data: CollectionUpdate) -> CollectionResponse:
        """Update a collection"""
        try:
            collection = self.repository.get_by_id(collection_id)
            if collection.owner_id != user_id:
                raise ForbiddenError(
                    error_code=4030,
                    message="You don't have permission to update this collection"
                )

            if collection_data.name is not None:
                collection.name = collection_data.name
            if collection_data.description is not None:
                collection.description = collection_data.description
            if collection_data.is_public is not None:
                collection.is_public = collection_data.is_public
            if collection_data.mood_id is not None:
                collection.mood_id = collection_data.mood_id

            updated_collection = self.repository.update(collection)
            return CollectionResponse.model_validate(updated_collection)
        except (ResourceNotFoundError, ForbiddenError):
            raise
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to update collection",
                details={"error": str(e)}
            )

    def delete_collection(self, user_id: int, collection_id: int) -> bool:
        """Delete a collection"""
        try:
            collection = self.repository.get_by_id(collection_id)
            if collection.owner_id != user_id:
                raise ForbiddenError(
                    message="You don't have permission to delete this collection"
                )

            return self.repository.delete(collection)
        except (ResourceNotFoundError, ForbiddenError):
            raise
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to delete collection",
                details={"error": str(e)}
            )

    def add_album_to_collection(self, user_id: int, collection_id: int, album_data: CollectionAlbumCreate) -> CollectionAlbumMetadataResponse:
        """Add an album to a collection with metadata"""
        try:
            # Verify collection exists and user owns it
            collection = self.repository.get_by_id(collection_id)
            if collection.owner_id != user_id:
                raise ForbiddenError(
                    error_code=4030,
                    message="You don't have permission to modify this collection"
                )

            # Check if album is already in collection
            existing = self.collection_album_repository.find_by_collection_and_album(
                collection_id, album_data.album_id)
            if existing:
                raise ValidationError(
                    error_code=4000,
                    message="Album is already in this collection"
                )

            # Create collection-album association with metadata
            collection_album = CollectionAlbum(
                collection_id=collection_id,
                album_id=album_data.album_id,
                state_record=album_data.state_record,
                state_cover=album_data.state_cover,
                acquisition_month_year=album_data.acquisition_month_year
            )

            created = self.collection_album_repository.create(collection_album)
            
            # Create response with state names instead of IDs
            response_data = {
                "collection_id": created.collection_id,
                "album_id": created.album_id,
                "state_record": created.state_record_ref.name if created.state_record_ref else None,
                "state_cover": created.state_cover_ref.name if created.state_cover_ref else None,
                "acquisition_month_year": created.acquisition_month_year
            }

            return CollectionAlbumMetadataResponse(**response_data)
        except (ResourceNotFoundError, ForbiddenError, ValidationError):
            raise
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to add album to collection",
                details={"error": str(e)}
            )

    def update_album_metadata(self, user_id: int, collection_id: int, album_id: int, metadata: CollectionAlbumUpdate) -> CollectionAlbumMetadataResponse:
        """Update album metadata in a collection"""
        try:
            # Get collection and check ownership
            collection = self.repository.get_by_id(collection_id)
            if collection.owner_id != user_id:
                raise ForbiddenError(
                    error_code=4030,
                    message="You don't have permission to update this collection"
                )

            # Find the collection-album association
            collection_album = self.collection_album_repository.find_by_collection_and_album(collection_id, album_id)
            if not collection_album:
                raise ResourceNotFoundError(
                    error_code=4040,
                    message=f"Album with id {album_id} not found",
                    details={"collection_id": collection_id, "album_id": album_id}
                )

            # Update vinyl states if provided
            if metadata.state_record is not None:
                state_record_id = self.collection_album_repository.get_vinyl_state_id(metadata.state_record)
                if state_record_id is None:
                    raise ValidationError(f"Invalid vinyl state: {metadata.state_record}")
                collection_album.state_record = state_record_id

            if metadata.state_cover is not None:
                state_cover_id = self.collection_album_repository.get_vinyl_state_id(metadata.state_cover)
                if state_cover_id is None:
                    raise ValidationError(f"Invalid vinyl state: {metadata.state_cover}")
                collection_album.state_cover = state_cover_id

            # Update acquisition month/year if provided
            if metadata.acquisition_month_year is not None:
                collection_album.acquisition_month_year = metadata.acquisition_month_year

            # Save changes
            self.repository.db.commit()
            self.repository.db.refresh(collection_album)

            # Return updated metadata
            return CollectionAlbumMetadataResponse(
                collection_id=collection_id,
                album_id=album_id,
                state_record=collection_album.state_record_ref.name if collection_album.state_record_ref else None,
                state_cover=collection_album.state_cover_ref.name if collection_album.state_cover_ref else None,
                acquisition_month_year=collection_album.acquisition_month_year
            )

        except (ResourceNotFoundError, ForbiddenError, ValidationError):
            raise
        except Exception as e:
            self.repository.db.rollback()
            raise ServerError(
                error_code=5000,
                message="Failed to update album metadata",
                details={"error": str(e)}
            )

    def remove_album_from_collection(self, user_id: int, collection_id: int, album_id: int) -> bool:
        """Remove an album from a collection"""
        try:
            # Verify collection exists and user owns it
            collection = self.repository.get_by_id(collection_id)
            if collection.owner_id != user_id:
                raise ForbiddenError(
                    error_code=4030,
                    message="You don't have permission to modify this collection"
                )

            # Remove album from collection
            self.repository.remove_albums(collection, [album_id])
            return True
        except ResourceNotFoundError:
            raise
        except Exception as e:
            logger.error(f"Error removing album from collection: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to remove album from collection",
                details={"error": str(e)}
            )

    def remove_artist_from_collection(self, user_id: int, collection_id: int, artist_id: int) -> bool:
        """Remove an artist from a collection"""
        try:
            # Verify collection exists and user owns it
            collection = self.repository.get_by_id(collection_id)
            if collection.owner_id != user_id:
                raise ForbiddenError(
                    error_code=4030,
                    message="You don't have permission to modify this collection"
                )

            # Remove artist from collection
            self.repository.remove_artists(collection, [artist_id])
            return True
        except ResourceNotFoundError:
            raise
        except Exception as e:
            logger.error(f"Error removing artist from collection: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to remove artist from collection",
                details={"error": str(e)}
            )

    def get_collection_albums(self, collection_id: int) -> List[CollectionAlbumResponse]:
        """Get all albums in a collection"""
        try:
            collection = self.repository.get_by_id(collection_id, load_relations=True)
            return [CollectionAlbumResponse.model_validate(ca) for ca in collection.collection_albums]
        except ResourceNotFoundError:
            raise
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to get collection albums",
                details={"error": str(e)}
            )

    def get_user_collections(self, user_id: int, page: int = 1, limit: int = 10) -> Tuple[List[CollectionResponse], int]:
        """Get collections owned by a user with pagination"""
        try:
            self._validate_pagination_params(page, limit)
            
            # Get all collections for the user
            all_collections = self.repository.get_by_owner(user_id)
            total = len(all_collections)
            
            # Apply pagination
            start_index = (page - 1) * limit
            end_index = start_index + limit
            collections = all_collections[start_index:end_index]
            
            # Convert to response models
            response_collections = []
            for collection in collections:
                try:
                    # Get likes info
                    likes_count = self.like_repository.count_likes(collection.id)
                    is_liked = self.like_repository.get(user_id, collection.id) is not None
                    
                    # Create response with proper mapping
                    response_data = {
                        "id": collection.id,
                        "name": collection.name,
                        "description": collection.description,
                        "is_public": collection.is_public,
                        "mood_id": collection.mood_id,
                        "owner_id": collection.owner_id,
                        "created_at": collection.created_at,
                        "updated_at": collection.updated_at,
                        "owner": collection.owner,
                        "albums": [ca.album for ca in collection.collection_albums],
                        "artists": [artist for artist in collection.artists],
                        "likes_count": likes_count,
                        "is_liked_by_user": is_liked
                    }
                    
                    response = CollectionResponse(**response_data)
                    response_collections.append(response)
                except Exception as e:
                    continue  # Skip this collection if there's an error
            
            return response_collections, total
            
        except Exception as e:
            logger.error(f"Error in get_user_collections: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to get user collections",
                details={"error": str(e)}
            )

    def get_public_collections(self, page: int = 1, limit: int = 10, exclude_user_id: int = None) -> Tuple[List[CollectionResponse], int]:
        """Get public collections with pagination"""
        try:
            self._validate_pagination_params(page, limit)
            
            collections = self.repository.get_public_collections(exclude_user_id=exclude_user_id)

            total = len(collections)
            
            # Apply pagination
            start = (page - 1) * limit
            end = start + limit
            paginated_collections = collections[start:end]
            
            # Convert to response models
            response_collections = []
            for i, collection in enumerate(paginated_collections):
                try:
                    # Get likes info
                    likes_count = self.like_repository.count_likes(collection.id)
                    
                    # Check if current user has liked this collection
                    is_liked_by_user = False
                    if exclude_user_id is not None:
                        is_liked_by_user = self.like_repository.get(exclude_user_id, collection.id) is not None
                    
                    # Get owner's wishlist
                    owner_wishlist_items = self.wishlist_repository.get_by_user_id(collection.owner_id)
                    
                    # Convert wishlist items to response format
                    wishlist_responses = []
                    for wishlist_item in owner_wishlist_items:
                        # Get entity type name from database
                        entity_type_record = self.repository.db.query(EntityType).filter(
                            EntityType.id == wishlist_item.entity_type_id
                        ).first()
                        entity_type_name = entity_type_record.name if entity_type_record else "UNKNOWN"
                        
                        # Get source name from database
                        source_record = self.repository.db.query(ExternalSource).filter(
                            ExternalSource.id == wishlist_item.external_source_id
                        ).first()
                        source_name = source_record.name if source_record else "UNKNOWN"
                        
                        wishlist_response = {
                            "id": wishlist_item.id,
                            "user_id": wishlist_item.user_id,
                            "external_id": wishlist_item.external_id,
                            "entity_type_id": wishlist_item.entity_type_id,
                            "external_source_id": wishlist_item.external_source_id,
                            "title": wishlist_item.title,
                            "image_url": wishlist_item.image_url,
                            "created_at": wishlist_item.created_at,
                            "entity_type": entity_type_name,
                            "source": source_name
                        }
                        wishlist_responses.append(wishlist_response)
                    
                    # Create response with proper mapping
                    response_data = {
                        "id": collection.id,
                        "name": collection.name,
                        "description": collection.description,
                        "is_public": collection.is_public,
                        "mood_id": collection.mood_id,
                        "owner_id": collection.owner_id,
                        "created_at": collection.created_at,
                        "updated_at": collection.updated_at,
                        "owner": collection.owner,
                        "albums": [ca.album for ca in collection.collection_albums],
                        "artists": [artist for artist in collection.artists],
                        "likes_count": likes_count,
                        "is_liked_by_user": is_liked_by_user,
                        "wishlist": wishlist_responses
                    }
                    
                    response = CollectionResponse(**response_data)
                    response_collections.append(response)
                except Exception as e:
                    continue  # Skip this collection if there's an error
            
            return response_collections, total
            
        except Exception as e:
            logger.error(f"Error in get_public_collections: {str(e)}")
            logger.error(f"Exception type: {type(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to get public collections",
                details={"error": str(e)}
            )

    def like_collection(self, user_id: int, collection_id: int) -> dict:
        """Like a collection"""
        try:
            collection = self.repository.get_by_id(collection_id)

            # Check if already liked
            existing_like = self.like_repository.get(user_id, collection_id)
            if existing_like:
                # Already liked, return current status
                likes_count = self.like_repository.count_likes(collection_id)
                return {
                    "collection_id": collection_id,
                    "liked": True,
                    "likes_count": likes_count,
                    "last_liked_at": existing_like.created_at
                }
            
            # Add like
            new_like = self.like_repository.add(user_id, collection_id)
            likes_count = self.like_repository.count_likes(collection_id)
            
            return {
                "collection_id": collection_id,
                "liked": True,
                "likes_count": likes_count,
                "last_liked_at": new_like.created_at if new_like else None
            }
        except ResourceNotFoundError:
            raise
        except DuplicateFieldError:
            # Handle case where user already liked (race condition)
            existing_like = self.like_repository.get(user_id, collection_id)
            likes_count = self.like_repository.count_likes(collection_id)
            return {
                "collection_id": collection_id,
                "liked": True,
                "likes_count": likes_count,
                "last_liked_at": existing_like.created_at if existing_like else None
            }
        except Exception as e:
            logger.error(f"Error in like_collection: {e}")
            raise ServerError(
                error_code=5000,
                message="Failed to like collection",
                details={"error": str(e)}
            )

    def unlike_collection(self, user_id: int, collection_id: int) -> dict:
        """Unlike a collection"""
        try:
            collection = self.repository.get_by_id(collection_id)

            # Remove like
            self.like_repository.remove(user_id, collection_id)
            likes_count = self.like_repository.count_likes(collection_id)
            
            return {
                "collection_id": collection_id,
                "liked": False,
                "likes_count": likes_count,
                "last_liked_at": None
            }
        except ResourceNotFoundError:
            raise
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to unlike collection",
                details={"error": str(e)}
            )

    def get_collection_likes(self, collection_id: int) -> int:
        """Get the number of likes for a collection"""
        try:
            collection = self.repository.get_by_id(collection_id)
            return self.like_repository.count_likes(collection_id)
        except ResourceNotFoundError:
            raise
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to get collection likes",
                details={"error": str(e)}
            )

    def _validate_collection_data(self, data: CollectionCreate) -> None:
        """Validate collection creation data."""
        if not data.name or len(data.name.strip()) == 0:
            raise ValidationError("Collection name cannot be empty")
        if data.description and len(data.description) > 255:
            raise ValidationError(
                "Description cannot be longer than 255 characters")

    def _validate_update_data(self, data: CollectionUpdate) -> None:
        """Validate collection update data."""
        if data.name is not None and len(data.name.strip()) == 0:
            raise ValidationError("Collection name cannot be empty")
        if data.description is not None and len(data.description) > 255:
            raise ValidationError(
                "Description cannot be longer than 255 characters")

    def _validate_pagination_params(self, page: int, limit: int) -> None:
        """Validate pagination parameters."""
        if page < 1:
            raise ValidationError("Page number must be greater than 0")
        if limit < 1 or limit > 100:
            raise ValidationError("Limit must be between 1 and 100")

    def get_collection_by_id(self, collection_id: int, user_id: int) -> CollectionResponse:
        """Get a collection by ID with proper access control"""
        try:
            collection = self.repository.get_by_id(collection_id, load_relations=True)
            
            # Check if user has access to the collection
            if not collection.is_public and collection.owner_id != user_id:
                raise ForbiddenError(
                    error_code=4030,
                    message="You don't have permission to access this collection"
                )
            
            # Get likes info
            likes_count = self.like_repository.count_likes(collection_id)
            is_liked_by_user = self.like_repository.get(user_id, collection_id) is not None
            
            # Get owner's wishlist
            owner_wishlist_items = self.wishlist_repository.get_by_user_id(collection.owner_id)
            
            # Convert wishlist items to response format
            wishlist_responses = []
            for wishlist_item in owner_wishlist_items:
                # Get entity type name from database
                entity_type_record = self.repository.db.query(EntityType).filter(
                    EntityType.id == wishlist_item.entity_type_id
                ).first()
                entity_type_name = entity_type_record.name if entity_type_record else "UNKNOWN"
                
                # Get source name from database
                source_record = self.repository.db.query(ExternalSource).filter(
                    ExternalSource.id == wishlist_item.external_source_id
                ).first()
                source_name = source_record.name if source_record else "UNKNOWN"
                
                wishlist_response = {
                    "id": wishlist_item.id,
                    "user_id": wishlist_item.user_id,
                    "external_id": wishlist_item.external_id,
                    "entity_type_id": wishlist_item.entity_type_id,
                    "external_source_id": wishlist_item.external_source_id,
                    "title": wishlist_item.title,
                    "image_url": wishlist_item.image_url,
                    "created_at": wishlist_item.created_at,
                    "entity_type": entity_type_name,
                    "source": source_name
                }
                wishlist_responses.append(wishlist_response)
            
            # Map collection albums to the correct format
            albums = []
            for collection_album in collection.collection_albums:
                album_data = {
                    "id": collection_album.album.id,
                    "external_album_id": collection_album.album.external_album_id,
                    "external_source_id": collection_album.album.external_source_id,
                    "title": collection_album.album.title,
                    "image_url": collection_album.album.image_url,
                    "state_record": collection_album.state_record_ref.name if collection_album.state_record_ref else None,
                    "state_cover": collection_album.state_cover_ref.name if collection_album.state_cover_ref else None,
                    "acquisition_month_year": collection_album.acquisition_month_year,
                    "created_at": collection_album.album.created_at,
                    "updated_at": collection_album.album.updated_at,
                    "collections_count": 0,
                    "loans_count": 0,
                    "wishlist_count": 0
                }
                albums.append(album_data)
            
            # Map collection artists to the correct format
            artists = []
            for artist in collection.artists:
                artist_data = {
                    "id": artist.id,
                    "external_artist_id": artist.external_artist_id,
                    "external_source_id": artist.external_source_id,
                    "title": artist.title,
                    "image_url": artist.image_url,
                    "created_at": artist.created_at,
                    "updated_at": artist.updated_at,
                    "collections_count": 0
                }
                artists.append(artist_data)
            
            # Create response data
            response_data = {
                "id": collection.id,
                "name": collection.name,
                "description": collection.description,
                "is_public": collection.is_public,
                "mood_id": collection.mood_id,
                "owner_id": collection.owner_id,
                "created_at": collection.created_at,
                "updated_at": collection.updated_at,
                "owner": collection.owner,
                "albums": albums,
                "artists": artists,
                "likes_count": likes_count,
                "is_liked_by_user": is_liked_by_user,
                "wishlist": wishlist_responses
            }
            
            return CollectionResponse(**response_data)
        except ResourceNotFoundError as e:
            raise e
        except ForbiddenError as e:
            raise e
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to get collection",
                details={"error": str(e)}
            )

    def get_collection_albums_paginated(self, collection_id: int, user_id: int, page: int = 1, limit: int = 12) -> PaginatedAlbumsResponse:
        """Get paginated albums for a collection"""
        try:
            # Validate pagination parameters
            self._validate_pagination_params(page, limit)
            
            # Get collection and check access
            collection = self.repository.get_by_id(collection_id)
            if not collection.is_public and collection.owner_id != user_id:
                raise ForbiddenError(
                    error_code=4030,
                    message="You don't have permission to access this collection"
                )
            
            # Get paginated albums
            albums, total = self.repository.get_collection_albums_paginated(collection_id, page, limit)
            
            # Map albums to response format and sort by date (newest first)
            album_responses = []
            for collection_album in albums:
                album_data = {
                    "id": collection_album.album.id,
                    "external_album_id": collection_album.album.external_album_id,
                    "external_source_id": collection_album.album.external_source_id,
                    "title": collection_album.album.title,
                    "image_url": collection_album.album.image_url,
                    "state_record": collection_album.state_record_ref.name if collection_album.state_record_ref else None,
                    "state_cover": collection_album.state_cover_ref.name if collection_album.state_cover_ref else None,
                    "acquisition_month_year": collection_album.acquisition_month_year,
                    "created_at": collection_album.album.created_at,
                    "updated_at": collection_album.album.updated_at,
                    "collections_count": 0,
                    "loans_count": 0,
                    "wishlist_count": 0
                }
                album_responses.append(album_data)
            
            # Sort by created_at first, then by updated_at (newest first)
            album_responses.sort(
                key=lambda x: (x["created_at"], x["updated_at"]),
                reverse=True
            )
            
            return PaginatedAlbumsResponse(
                items=album_responses,
                total=total,
                page=page,
                limit=limit,
                total_pages=(total + limit - 1) // limit
            )
        except (ResourceNotFoundError, ForbiddenError):
            raise
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to get collection albums",
                details={"error": str(e)}
            )

    def get_collection_artists_paginated(self, collection_id: int, user_id: int, page: int = 1, limit: int = 12) -> PaginatedArtistsResponse:
        """Get paginated artists for a collection"""
        try:
            self._validate_pagination_params(page, limit)
            
            # Get collection and verify access
            collection = self.repository.get_by_id(collection_id)
            if not collection.is_public and collection.owner_id != user_id:
                raise ForbiddenError(
                    error_code=4030,
                    message="You don't have permission to view this collection"
                )
            
            # Get paginated artists
            artists, total = self.repository.get_collection_artists_paginated(collection_id, page, limit)
            
            # Convert to response format
            items = []
            for artist in artists:
                response = CollectionArtistResponse.model_validate(artist)
                items.append(response)
            
            return PaginatedArtistsResponse(
                items=items,
                total=total,
                page=page,
                limit=limit,
                total_pages=(total + limit - 1) // limit
            )
        except (ResourceNotFoundError, ForbiddenError):
            raise
        except Exception as e:
            logger.error(f"Error getting collection artists paginated: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get collection artists",
                details={"error": str(e)}
            )

    def search_collection_items(self, collection_id: int, user_id: int, query: str, search_type: str = "both") -> dict:
        """Search albums and/or artists in a collection"""
        try:
            # Get collection and verify access with all relations loaded
            collection = self.repository.get_by_id(collection_id, load_relations=True)
            if not collection.is_public and collection.owner_id != user_id:
                raise ForbiddenError(
                    error_code=4030,
                    message="You don't have permission to view this collection"
                )
            
            results = {
                "albums": [],
                "artists": [],
                "search_term": query,
                "search_type": search_type
            }
            
            # Search albums if requested
            if search_type in ["album", "both"]:
                albums = self.repository.search_collection_albums(collection_id, query)
                # Convert albums to the correct format with collection metadata
                album_responses = []
                for album in albums:
                    # Find the collection album association to get metadata
                    collection_album = next(
                        (ca for ca in collection.collection_albums if ca.album_id == album.id),
                        None
                    )
                    
                    album_data = {
                        "id": album.id,
                        "external_album_id": album.external_album_id,
                        "external_source_id": album.external_source_id,
                        "title": album.title,
                        "image_url": album.image_url,
                        "state_record": collection_album.state_record_ref.name if collection_album and collection_album.state_record_ref else None,
                        "state_cover": collection_album.state_cover_ref.name if collection_album and collection_album.state_cover_ref else None,
                        "acquisition_month_year": collection_album.acquisition_month_year if collection_album else None,
                        "created_at": album.created_at,
                        "updated_at": album.updated_at,
                        "collections_count": 0,
                        "loans_count": 0,
                        "wishlist_count": 0
                    }
                    album_responses.append(album_data)
                
                results["albums"] = album_responses
            
            # Search artists if requested
            if search_type in ["artist", "both"]:
                artists = self.repository.search_collection_artists(collection_id, query)
                # Convert artists to the correct format
                artist_responses = []
                for artist in artists:
                    artist_data = {
                        "id": artist.id,
                        "external_artist_id": artist.external_artist_id,
                        "external_source_id": artist.external_source_id,
                        "title": artist.title,
                        "image_url": artist.image_url,
                        "created_at": artist.created_at,
                        "updated_at": artist.updated_at,
                        "collections_count": 0
                    }
                    artist_responses.append(artist_data)
                
                results["artists"] = artist_responses
            
            return results
        except (ResourceNotFoundError, ForbiddenError):
            raise
        except Exception as e:
            logger.error(f"Error searching collection items: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to search collection items",
                details={"error": str(e)}
            )
