from typing import List
from app.repositories.external_reference_repository import ExternalReferenceRepository
from app.schemas.external_reference_schema import (
    AddToWishlistRequest,
    AddToCollectionRequest,
    WishlistItemResponse,
    CollectionItemResponse
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

            if request.entity_type == EntityTypeEnum.ALBUM:
                entity = await self.repository.find_album_by_external_id(external_id)
                if not entity:
                    entity = await self.repository.create_album(AlbumCreate(
                        external_album_id=external_id,
                        title=request.title,
                        image_url=request.image_url,
                        external_source_id=await self.repository.get_external_source_id(request.source)
                    ))
                    return AlbumResponse.model_validate(entity)
                else:
                    return AlbumResponse.model_validate(entity)
            else:
                entity = await self.repository.find_artist_by_external_id(external_id)
                if not entity:
                    entity = await self.repository.create_artist(ArtistCreate(
                        external_artist_id=external_id,
                        title=request.title,
                        image_url=request.image_url,
                        external_source_id=await self.repository.get_external_source_id(request.source)
                    ))
                    return ArtistResponse.model_validate(entity)
                else:
                    return ArtistResponse.model_validate(entity)

        except Exception as e:
            logger.error(f"Failed to find or create entity: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to find or create entity",
                details={"error": str(e)}
            )

    async def add_to_wishlist(self, user_id: int, request: AddToWishlistRequest) -> WishlistItemResponse:
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
            if existing:
                return self._build_wishlist_response(existing, request.entity_type.value, request.source)

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

            return self._build_wishlist_response(result, request.entity_type.value, request.source)

        except Exception as e:
            logger.error(f"Failed to add to wishlist: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to add to wishlist",
                details={"error": str(e)}
            )

    def _build_wishlist_response(self, wishlist_item: Wishlist, entity_type: str, source: str) -> WishlistItemResponse:
        """Build wishlist response with additional fields"""
        response_data = {
            "id": wishlist_item.id,
            "user_id": wishlist_item.user_id,
            "external_id": wishlist_item.external_id,
            "entity_type_id": wishlist_item.entity_type_id,
            "external_source_id": wishlist_item.external_source_id,
            "title": wishlist_item.title,
            "image_url": wishlist_item.image_url,
            "created_at": wishlist_item.created_at,
            "entity_type": entity_type,
            "source": source
        }
        return WishlistItemResponse(**response_data)

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

    async def add_to_collection(self, user_id: int, collection_id: int, request: AddToCollectionRequest) -> CollectionItemResponse:
        """Add an album or artist to a collection"""
        try:
            external_id = request.get_external_id()
            if not external_id:
                raise ValidationError(
                    error_code=4000,
                    message="External ID must be provided"
                )

            # Get collection and verify ownership
            collection = await self.repository.find_collection_by_id(collection_id)
            if not collection or collection.owner_id != user_id:
                raise ResourceNotFoundError(
                    error_code=4040,
                    message=f"Collection {collection_id} not found or not owned by user {user_id}"
                )

            # Find or create entity
            entity_response = await self._find_or_create_entity(request)
            
            # Add to collection using the entity from the response
            collection_item = None
            if request.entity_type == EntityTypeEnum.ALBUM:
                # Get the album from the database using the external ID
                album = await self.repository.find_album_by_external_id(external_id)
                if not album:
                    raise ValidationError(
                        error_code=4000,
                        message="Album not found",
                        details={"external_id": external_id}
                    )
                
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
                artist = await self.repository.find_artist_by_external_id(external_id)
                if not artist:
                    raise ValidationError(
                        error_code=4000,
                        message="Artist not found",
                        details={"external_id": external_id}
                    )
                
                collection_item = await self.repository.add_artist_to_collection(collection, artist)

            # Build response with data from the created collection item
            if request.entity_type == EntityTypeEnum.ALBUM:
                # For albums, collection_item is a CollectionAlbum object with composite primary key
                response_data = {
                    "id": collection_item.collection_id,  # Use collection_id as ID
                    "user_id": user_id,
                    "collection_id": collection_id,
                    "external_id": external_id,
                    "entity_type": request.entity_type.value,
                    "title": request.title,
                    "image_url": request.image_url,
                    "source": request.source,
                    "created_at": collection_item.collection.created_at if collection_item.collection else datetime.now()
                }
            else:
                # For artists, collection_item is a dictionary
                response_data = {
                    "id": collection_item["id"],
                    "user_id": user_id,
                    "collection_id": collection_id,
                    "external_id": external_id,
                    "entity_type": request.entity_type.value,
                    "title": request.title,
                    "image_url": request.image_url,
                    "source": request.source,
                    "created_at": collection_item["created_at"]
                }
            
            if request.entity_type == EntityTypeEnum.ALBUM and request.album_data:
                response_data["album_data"] = request.album_data.dict(exclude_none=True)
            
            return CollectionItemResponse(**response_data)

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
            collection = await self.repository.find_collection_by_id(collection_id)
            if not collection or collection.owner_id != user_id:
                raise ResourceNotFoundError(
                    error_code=4040,
                    message=f"Collection {collection_id} not found or not owned by user {user_id}"
                )

            # Find entity
            if entity_type == EntityTypeEnum.ALBUM:
                album = await self.repository.find_album_by_external_id(external_id)
                if not album:
                    raise ResourceNotFoundError(
                        error_code=4040,
                        message=f"Album with external ID {external_id} not found"
                    )
                await self.repository.remove_album_from_collection(collection, album)
            else:
                artist = await self.repository.find_artist_by_external_id(external_id)
                if not artist:
                    raise ResourceNotFoundError(
                        error_code=4040,
                        message=f"Artist with external ID {external_id} not found"
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

