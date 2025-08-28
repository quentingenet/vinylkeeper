from typing import List
from app.repositories.external_reference_repository import ExternalReferenceRepository
from app.schemas.external_reference_schema import (
    AddToWishlistRequest,
    AddToCollectionRequest,
    WishlistItemResponse,
    CollectionItemResponse,
    AddToWishlistResponse,
    AddToCollectionResponse
)
from app.schemas.album_schema import AlbumResponse, AlbumCreate
from app.schemas.artist_schema import ArtistResponse, ArtistCreate
from app.core.exceptions import (
    ValidationError,
    ResourceNotFoundError,
    ServerError
)
from app.core.logging import logger
from app.core.enums import EntityTypeEnum
from app.models.reference_data.entity_types import EntityType
from app.models.reference_data.external_sources import ExternalSource
from app.models.wishlist_model import Wishlist
from datetime import datetime


class ExternalReferenceService:
    """Service for managing external references"""

    def __init__(self, repository: ExternalReferenceRepository):
        self.repository = repository

    async def _find_or_create_entity(self, request: AddToWishlistRequest | AddToCollectionRequest) -> AlbumResponse | ArtistResponse:
        """Find existing entity or create new one"""
        try:
            external_id = request.get_external_id()
            if not external_id:
                raise ValidationError(
                    error_code=4000,
                    message="External ID must be provided"
                )

            # Get the external source ID first
            external_source_id = await self.repository.get_external_source_id(request.source)

            if request.entity_type == EntityTypeEnum.ALBUM:
                # Try to find existing album first
                entity = await self.repository.find_album_by_external_id(external_id, external_source_id)
                if not entity:
                    # Album doesn't exist, create it
                    try:
                        entity = await self.repository.create_album(AlbumCreate(
                            external_album_id=external_id,
                            title=request.title,
                            image_url=request.image_url,
                            external_source_id=external_source_id
                        ))
                    except Exception as create_error:
                        # If creation fails (e.g., due to race condition), try to find again
                        logger.warning(f"Failed to create album, trying to find existing: {str(create_error)}")
                        entity = await self.repository.find_album_by_external_id(external_id, external_source_id)
                        if not entity:
                            # Still not found, this is a real error
                            logger.error(f"Failed to create album and could not find existing: {str(create_error)}")
                            raise create_error
                        else:
                            pass
                
                # Convert SQLAlchemy object to dict for Pydantic validation
                entity_dict = {
                    "id": entity.id,
                    "external_album_id": entity.external_album_id,
                    "external_source_id": entity.external_source_id,
                    "external_source": {
                        "id": entity.external_source.id,
                        "name": entity.external_source.name
                    } if entity.external_source else None,
                    "title": entity.title,
                    "artist": None,  # Album model doesn't have artist field
                    "image_url": entity.image_url,
                    "created_at": entity.created_at,
                    "updated_at": entity.updated_at
                }
                return AlbumResponse.model_validate(entity_dict)
            else:
                # Try to find existing artist first
                entity = await self.repository.find_artist_by_external_id(external_id, external_source_id)
                if not entity:
                    # Artist doesn't exist, create it
                    try:
                        entity = await self.repository.create_artist(ArtistCreate(
                            external_artist_id=external_id,
                            title=request.title,
                            image_url=request.image_url,
                            external_source_id=external_source_id
                        ))
                    except Exception as create_error:
                        # If creation fails (e.g., due to race condition), try to find again
                        logger.warning(f"Failed to create artist, trying to find existing: {str(create_error)}")
                        entity = await self.repository.find_artist_by_external_id(external_id, external_source_id)
                        if not entity:
                            # Still not found, this is a real error
                            logger.error(f"Failed to create artist and could not find existing: {str(create_error)}")
                            raise create_error
                        else:
                            pass
                
                # Convert SQLAlchemy object to dict for Pydantic validation
                entity_dict = {
                    "id": entity.id,
                    "external_artist_id": entity.external_artist_id,
                    "external_source_id": entity.external_source_id,
                    "external_source": {
                        "id": entity.external_source.id,
                        "name": entity.external_source.name
                    } if entity.external_source else None,
                    "title": entity.title,
                    "artist": entity.title,  # For Artist model, artist = title
                    "image_url": entity.image_url,
                    "created_at": entity.created_at,
                    "updated_at": entity.updated_at
                }
                return ArtistResponse.model_validate(entity_dict)

        except Exception as e:
            logger.error(f"Failed to find or create entity: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to find or create entity",
                details={"error": str(e)}
            )

    async def add_to_wishlist(self, user_id: int, request: AddToWishlistRequest) -> AddToWishlistResponse:
        """Add an album or artist to the wishlist"""
        try:
            external_id = request.get_external_id()
            if not external_id:
                raise ValidationError(
                    error_code=4000,
                    message="External ID must be provided"
                )

            # Check if item already exists in wishlist
            existing = await self.repository.find_wishlist_item(user_id, external_id, request.entity_type)
            is_new = False
            if existing:
                wishlist_response = self._build_wishlist_response(existing, request.entity_type.value, request.source)
                return AddToWishlistResponse(
                    item=wishlist_response,
                    is_new=False,
                    message=f"Already have {request.entity_type.value} '{request.title}' in wishlist",
                    entity_type=request.entity_type.value
                )

            # Find or create entity
            await self._find_or_create_entity(request)

            # Create wishlist item
            wishlist_data = {
                "user_id": user_id,
                "external_id": external_id,
                "entity_type_id": await self.repository.get_entity_type_id(request.entity_type),
                "external_source_id": await self.repository.get_external_source_id(request.source),
                "title": request.title,
                "image_url": request.image_url
            }
            
            result = await self.repository.create_wishlist_item(wishlist_data)

            wishlist_response = self._build_wishlist_response(result, request.entity_type.value, request.source)
            return AddToWishlistResponse(
                item=wishlist_response,
                is_new=True,
                message=f"Added {request.entity_type.value} '{request.title}' to wishlist",
                entity_type=request.entity_type.value
            )

        except Exception as e:
            logger.error(f"Failed to add to wishlist: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to add to wishlist",
                details={"error": str(e)}
            )

    def _build_wishlist_response(self, wishlist_item: Wishlist, entity_type: str, source: str) -> WishlistItemResponse:
        """Build wishlist response with additional fields"""
        wishlist_dict = {
            "id": wishlist_item.id,
            "user_id": wishlist_item.user_id,
            "external_id": wishlist_item.external_id,
            "entity_type_id": wishlist_item.entity_type_id,
            "external_source_id": wishlist_item.external_source_id,
            "title": wishlist_item.title,
            "image_url": wishlist_item.image_url,
            "created_at": wishlist_item.created_at,
            "entity_type": entity_type.lower(),
            "source": source.lower()
        }
        return WishlistItemResponse.model_validate(wishlist_dict)

    async def remove_from_wishlist(self, user_id: int, wishlist_id: int) -> bool:
        """Remove an item from user's wishlist"""
        try:
            # Find wishlist item and verify ownership
            wishlist_item = await self.repository.wishlist_repo.get_by_id(wishlist_id)
            if not wishlist_item or wishlist_item.user_id != user_id:
                raise ResourceNotFoundError(
                    error_code=4040,
                    message=f"Wishlist item {wishlist_id} not found or not owned by user {user_id}"
                )
            
            result = await self.repository.remove_wishlist_item(wishlist_item)
            return result
        except ResourceNotFoundError:
            raise
        except Exception as e:
            logger.error(f"Failed to remove from wishlist: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to remove from wishlist",
                details={"error": str(e)}
            )

    async def add_to_collection(self, user_id: int, collection_id: int, request: AddToCollectionRequest) -> AddToCollectionResponse:
        """Add an album or artist to a collection"""
        try:
            external_id = request.get_external_id()
            if not external_id:
                raise ValidationError(
                    error_code=4000,
                    message="External ID must be provided"
                )

            # Get collection and verify ownership
            collection = await self.repository.find_collection_by_id(collection_id, load_relations=True)
            if not collection or collection.owner_id != user_id:
                raise ResourceNotFoundError(
                    error_code=4040,
                    message=f"Collection {collection_id} not found or not owned by user {user_id}"
                )

            # Find or create entity
            entity_response = await self._find_or_create_entity(request)
            
            # Get the external source ID for database queries
            external_source_id = await self.repository.get_external_source_id(request.source)
            
            # Add to collection using the entity from the response
            collection_item = None
            if request.entity_type == EntityTypeEnum.ALBUM:
                # Use the album from the entity response instead of searching again
                album = await self.repository.find_album_by_external_id(external_id, external_source_id)
                if not album:
                    logger.error(f"Album not found after creation! external_id: {external_id}, source_id: {external_source_id}")
                    raise ValidationError(
                        error_code=4000,
                        message="Album not found after creation",
                        details={"external_id": external_id}
                    )
                
                # Check if album is already in collection before trying to add
                existing_collection_album = None
                for ca in collection.collection_albums:
                    if ca.album_id == album.id:
                        existing_collection_album = ca
                        break
                
                is_new_album = False
                if existing_collection_album:
                    # Album already in collection, return existing info
                    collection_item = existing_collection_album
                else:
                    is_new_album = True
                    # Process album_data to convert names to IDs
                    processed_album_data = None
                    if request.album_data:
                        album_data_dict = request.album_data.dict(exclude_none=True)
                        processed_album_data = album_data_dict.copy()

                        state_record = processed_album_data.pop('state_record', None)
                        if state_record:
                            processed_album_data['state_record_id'] = await self.repository.get_vinyl_state_id(state_record)

                        state_cover = processed_album_data.pop('state_cover', None)
                        if state_cover:
                            processed_album_data['state_cover_id'] = await self.repository.get_vinyl_state_id(state_cover)
                        
                        # acquisition_month_year is already in the correct format, no conversion needed
                    collection_item = await self.repository.add_album_to_collection(collection, album, processed_album_data)
            else:
                # Get the artist from the database using the external ID
                artist = await self.repository.find_artist_by_external_id(external_id, external_source_id)
                if not artist:
                    logger.error(f"Artist not found after creation! external_id: {external_id}, source_id: {external_source_id}")
                    raise ValidationError(
                        error_code=4000,
                        message="Artist not found",
                        details={"external_id": external_id}
                    )
                
                # Check if artist is already in collection before trying to add
                is_new_artist = False
                existing_artist = await self.repository.find_artist_in_collection(collection.id, artist.id)
                
                if existing_artist:
                    # Artist already in collection, return existing info
                    collection_item = {
                        "id": artist.id,
                        "collection_id": collection.id,
                        "artist_id": artist.id,
                        "created_at": existing_artist["created_at"]
                    }
                else:
                    is_new_artist = True
                    collection_item = await self.repository.add_artist_to_collection(collection, artist)

            # Build response with data from the created collection item
            # Determine if item is new or existing
            is_new = is_new_album if request.entity_type == EntityTypeEnum.ALBUM else is_new_artist
            
            # Build the collection item response
            if request.entity_type == EntityTypeEnum.ALBUM:
                # For albums, collection_item is a CollectionAlbum object with composite primary key
                item_response = CollectionItemResponse(
                    id=collection_item.collection_id,  # Use collection_id as ID
                    user_id=user_id,
                    external_id=external_id,
                    entity_type=request.entity_type.value,
                    title=request.title,
                    image_url=request.image_url,
                    source=request.source,
                    created_at=collection.created_at
                )
            else:
                # For artists, collection_item is a dictionary
                item_response = CollectionItemResponse(
                    id=collection_item["id"],
                    user_id=user_id,
                    external_id=external_id,
                    entity_type=request.entity_type.value,
                    title=request.title,
                    image_url=request.image_url,
                    source=request.source,
                    created_at=collection_item["created_at"]
                )
            
            # Build the final response with status information
            message = f"{'Added' if is_new else 'Already have'} {request.entity_type.value} '{request.title}' in collection '{collection.name}'"
            
            final_response = AddToCollectionResponse(
                item=item_response,
                is_new=is_new,
                message=message,
                entity_type=request.entity_type.value,
                collection_name=collection.name
            )
            
            return final_response

        except Exception as e:
            logger.error(f"Failed to add to collection: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to add to collection",
                details={"error": str(e)}
            )

    async def remove_from_collection(self, user_id: int, collection_id: int, external_id: str, entity_type: EntityTypeEnum) -> bool:
        """Remove an album or artist from a collection"""
        try:
            # Get collection and verify ownership
            collection = await self.repository.find_collection_by_id(collection_id, load_relations=True)
            if not collection or collection.owner_id != user_id:
                raise ResourceNotFoundError(
                    error_code=4040,
                    message=f"Collection {collection_id} not found or not owned by user {user_id}"
                )

            # Find entity directly in the collection to avoid external_source_id issues
            if entity_type == EntityTypeEnum.ALBUM:
                # For albums, find the collection album first
                collection_album = await self.repository.find_collection_album_by_external_id(collection_id, external_id)
                
                if not collection_album:
                    raise ResourceNotFoundError(
                        error_code=4040,
                        message=f"Album with external ID {external_id} not found in collection {collection_id}"
                    )
                
                await self.repository.remove_album_from_collection(collection, collection_album.album)
            else:
                # For artists, find the collection artist first
                artist = await self.repository.find_collection_artist_by_external_id(collection_id, external_id)
                
                if not artist:
                    raise ResourceNotFoundError(
                        error_code=4040,
                        message=f"Artist with external ID {external_id} not found in collection {collection_id}"
                    )
                
                await self.repository.remove_artist_from_collection(collection, artist)

            return True

        except ResourceNotFoundError:
            raise
        except Exception as e:
            logger.error(f"Failed to remove from collection: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to remove from collection",
                details={"error": str(e)}
            )

    async def get_user_wishlist(self, user_id: int) -> List[WishlistItemResponse]:
        """Get user's wishlist"""
        try:
            wishlist_items = await self.repository.get_user_wishlist(user_id)
            
            # Build responses with additional fields
            responses = []
            for item in wishlist_items:
                # Get entity type name
                entity_type_name = item.entity_type.name if item.entity_type else "Unknown"
                
                # Get source name
                source_name = item.external_source.name if item.external_source else "Unknown"
                
                response = self._build_wishlist_response(item, entity_type_name, source_name)
                responses.append(response)
            
            return responses

        except Exception as e:
            logger.error(f"Failed to get user wishlist: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get user wishlist",
                details={"error": str(e)}
            )

    async def get_collection_items(self, user_id: int) -> List[CollectionItemResponse]:
        """Get user's collection items"""
        try:
            # This method should be implemented based on your collection structure
            # For now, returning empty list as placeholder
            return []
        except Exception as e:
            logger.error(f"Failed to get collection items: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get collection items",
                details={"error": str(e)}
            )

