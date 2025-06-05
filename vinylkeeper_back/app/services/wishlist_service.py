from typing import List
from app.repositories.wishlist_repository import WishlistRepository
from app.repositories.external_reference_repository import ExternalReferenceRepository
from app.schemas.external_reference_schema import (
    AddToWishlistRequest,
    WishlistItemResponse
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
from app.models.wishlist_model import Wishlist
from app.models.reference_data.entity_types import EntityType
from app.models.reference_data.external_sources import ExternalSource


class WishlistService:
    """Service for managing wishlist operations"""

    def __init__(self, wishlist_repo: WishlistRepository, external_ref_repo: ExternalReferenceRepository):
        self.wishlist_repo = wishlist_repo
        self.external_ref_repo = external_ref_repo

    def _find_or_create_entity(self, request: AddToWishlistRequest) -> AlbumResponse | ArtistResponse:
        """Find existing entity or create new one"""
        try:
            external_id = request.get_external_id()
            if not external_id:
                raise ValidationError(
                    error_code=4000,
                    message="External ID must be provided"
                )

            if request.entity_type == EntityTypeEnum.ALBUM:
                entity = self.external_ref_repo.find_album_by_external_id(external_id)
                if not entity:
                    entity = self.external_ref_repo.create_album(AlbumCreate(
                        external_album_id=external_id,
                        title=request.title,
                        image_url=request.image_url,
                        external_source_id=self.external_ref_repo.get_external_source_id(request.source)
                    ))
                    return AlbumResponse.model_validate(entity)
                else:
                    return AlbumResponse.model_validate(entity)
            else:
                entity = self.external_ref_repo.find_artist_by_external_id(external_id)
                if not entity:
                    entity = self.external_ref_repo.create_artist(ArtistCreate(
                        external_artist_id=external_id,
                        title=request.title,
                        image_url=request.image_url,
                        external_source_id=self.external_ref_repo.get_external_source_id(request.source)
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
            existing = self.external_ref_repo.find_wishlist_item(user_id, external_id, request.entity_type)
            if existing:
                return self._build_wishlist_response(existing, request.entity_type.value, request.source)

            # Find or create entity
            self._find_or_create_entity(request)

            # Create wishlist item
            wishlist_data = {
                "user_id": user_id,
                "external_id": external_id,
                "entity_type_id": self.external_ref_repo.get_entity_type_id(request.entity_type),
                "external_source_id": self.external_ref_repo.get_external_source_id(request.source),
                "title": request.title,
                "image_url": request.image_url
            }
            
            result = self.external_ref_repo.create_wishlist_item(wishlist_data)

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
            wishlist_item = self.wishlist_repo.get_by_id(wishlist_id)
            if not wishlist_item or wishlist_item.user_id != user_id:
                raise ResourceNotFoundError(
                    error_code=4040,
                    message=f"Wishlist item {wishlist_id} not found or not owned by user {user_id}"
                )
            
            result = self.external_ref_repo.remove_wishlist_item(wishlist_item)
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

    def get_user_wishlist(self, user_id: int) -> List[WishlistItemResponse]:
        """Get user's wishlist items"""
        try:
            items = self.wishlist_repo.get_user_wishlist(user_id)
            
            responses = []
            for item in items:
                # Get entity type name from database
                entity_type_record = self.external_ref_repo.db.query(EntityType).filter(
                    EntityType.id == item.entity_type_id
                ).first()
                entity_type_name = entity_type_record.name if entity_type_record else "UNKNOWN"
                
                # Get source name from database
                source_record = self.external_ref_repo.db.query(ExternalSource).filter(
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