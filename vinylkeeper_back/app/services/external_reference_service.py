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


class ExternalReferenceService:
    """Service for managing external references"""

    def __init__(self, repository: ExternalReferenceRepository):
        self.repository = repository

    def _find_or_create_entity(self, request: AddToWishlistRequest | AddToCollectionRequest) -> AlbumResponse | ArtistResponse:
        """Find existing entity or create new one"""
        try:
            external_id = request.get_external_id()
            if not external_id:
                raise ValidationError(
                    error_code=4000,
                    message="External ID must be provided"
                )

            if request.entity_type == EntityTypeEnum.ALBUM:
                entity = self.repository.find_album_by_external_id(external_id)
                if not entity:
                    entity = self.repository.create_album(AlbumCreate(
                        external_album_id=external_id,
                        title=request.title,
                        image_url=request.image_url,
                        external_source_id=self.repository.get_external_source_id(request.source)
                    ))
                    return AlbumResponse.model_validate(entity)
                else:
                    return AlbumResponse.model_validate(entity)
            else:
                entity = self.repository.find_artist_by_external_id(external_id)
                if not entity:
                    entity = self.repository.create_artist(ArtistCreate(
                        external_artist_id=external_id,
                        title=request.title,
                        image_url=request.image_url,
                        external_source_id=self.repository.get_external_source_id(request.source)
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

    def add_to_wishlist(self, user_id: int, request: AddToWishlistRequest) -> WishlistItemResponse:
        """Add an album or artist to the wishlist"""
        try:
            external_id = request.get_external_id()
            if not external_id:
                raise ValidationError(
                    error_code=4000,
                    message="External ID must be provided"
                )

            # Check if item already exists in wishlist
            existing = self.repository.find_wishlist_item(user_id, external_id, request.entity_type)
            if existing:
                return self._build_wishlist_response(existing, request.entity_type.value, request.source)

            # Find or create entity
            self._find_or_create_entity(request)

            # Create wishlist item
            wishlist_data = {
                "user_id": user_id,
                "external_id": external_id,
                "entity_type_id": self.repository.get_entity_type_id(request.entity_type),
                "external_source_id": self.repository.get_external_source_id(request.source),
                "title": request.title,
                "image_url": request.image_url
            }
            
            result = self.repository.create_wishlist_item(wishlist_data)

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

    def remove_from_wishlist(self, user_id: int, wishlist_id: int) -> bool:
        """Remove an item from user's wishlist"""
        try:
            # Find wishlist item and verify ownership
            wishlist_item = self.repository.wishlist_repo.get_by_id(wishlist_id)
            if not wishlist_item or wishlist_item.user_id != user_id:
                raise ResourceNotFoundError(
                    error_code=4040,
                    message=f"Wishlist item {wishlist_id} not found or not owned by user {user_id}"
                )
            
            result = self.repository.remove_wishlist_item(wishlist_item)
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

    def add_to_collection(self, user_id: int, collection_id: int, request: AddToCollectionRequest) -> CollectionItemResponse:
        """Add an album or artist to a collection"""
        try:
            external_id = request.get_external_id()
            if not external_id:
                raise ValidationError(
                    error_code=4000,
                    message="External ID must be provided"
                )

            # Get collection and verify ownership
            collection = self.repository.find_collection_by_id(collection_id)
            if not collection or collection.owner_id != user_id:
                raise ResourceNotFoundError(
                    error_code=4040,
                    message=f"Collection {collection_id} not found or not owned by user {user_id}"
                )

            # Find or create entity
            entity_response = self._find_or_create_entity(request)
            
            # Add to collection using the entity from the response
            if request.entity_type == EntityTypeEnum.ALBUM:
                # Get the album from the database using the external ID
                album = self.repository.find_album_by_external_id(external_id)
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
                        processed_album_data['state_record_id'] = self.repository.get_vinyl_state_id(state_record)

                    state_cover = processed_album_data.pop('state_cover', None)
                    if state_cover:
                        processed_album_data['state_cover_id'] = self.repository.get_vinyl_state_id(state_cover)
                    
                    # acquisition_month_year is already in the correct format, no conversion needed
                self.repository.add_album_to_collection(collection, album, processed_album_data)
            else:
                # Get the artist from the database using the external ID
                artist = self.repository.find_artist_by_external_id(external_id)
                if not artist:
                    raise ValidationError(
                        error_code=4000,
                        message="Artist not found",
                        details={"external_id": external_id}
                    )
                self.repository.add_artist_to_collection(collection, artist)

            # Create proper CollectionItemResponse
            collection_item_data = {
                "id": entity_response.id,
                "external_id": external_id,
                "entity_type": request.entity_type.value,
                "title": request.title,
                "image_url": request.image_url,
                "source": request.source,
                "user_id": user_id,
                "created_at": entity_response.created_at
            }
            
            return CollectionItemResponse(**collection_item_data)

        except Exception as e:
            logger.error(f"Failed to add to collection: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to add to collection",
                details={"error": str(e)}
            )

    def remove_from_collection(self, user_id: int, collection_id: int, external_id: str, entity_type: EntityTypeEnum) -> bool:
        """Remove an item from user's collection"""
        try:
            # Get collection and verify ownership
            collection = self.repository.find_collection_by_id(collection_id)
            if not collection or collection.owner_id != user_id:
                raise ResourceNotFoundError(
                    error_code=4040,
                    message=f"Collection {collection_id} not found or not owned by user {user_id}"
                )

            # Find entity and remove from collection
            if entity_type == EntityTypeEnum.ALBUM:
                album = self.repository.find_album_by_external_id(external_id)
                if album:
                    self.repository.remove_album_from_collection(collection, album)
            else:
                artist = self.repository.find_artist_by_external_id(external_id)
                if artist:
                    self.repository.remove_artist_from_collection(collection, artist)

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
    def get_user_wishlist(self, user_id: int) -> List[WishlistItemResponse]:
        """Get user's wishlist items"""
        try:
            items = self.repository.wishlist_repo.get_user_wishlist(user_id)
            
            responses = []
            for item in items:
                # Get entity type name from database
                entity_type_record = self.repository.db.query(EntityType).filter(
                    EntityType.id == item.entity_type_id
                ).first()
                entity_type_name = entity_type_record.name if entity_type_record else "UNKNOWN"
                
                # Get source name from database
                source_record = self.repository.db.query(ExternalSource).filter(
                    ExternalSource.id == item.external_source_id
                ).first()
                source_name = source_record.name if source_record else "UNKNOWN"
                
                response_data = {
                    "id": item.id,
                    "user_id": item.user_id,
                    "external_id": item.external_id,
                    "entity_type_id": item.entity_type_id,
                    "external_source_id": item.external_source_id,
                    "title": item.title,
                    "image_url": item.image_url,
                    "created_at": item.created_at,
                    "entity_type": entity_type_name,
                    "source": source_name
                }
                responses.append(WishlistItemResponse(**response_data))
            
            return responses
            
        except Exception as e:
            logger.error(f"Failed to get user wishlist: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get user wishlist",
                details={"error": str(e)}
            )

