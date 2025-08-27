from typing import List
from app.repositories.wishlist_repository import WishlistRepository
from app.repositories.external_reference_repository import ExternalReferenceRepository
from app.schemas.external_reference_schema import (
    AddToWishlistRequest,
    WishlistItemResponse,
    AddToWishlistResponse
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
from sqlalchemy import select


class WishlistService:
    """Service for managing wishlist operations"""

    def __init__(self, wishlist_repo: WishlistRepository, external_ref_repo: ExternalReferenceRepository):
        self.wishlist_repo = wishlist_repo
        self.external_ref_repo = external_ref_repo

    async def _find_or_create_entity(self, request: AddToWishlistRequest) -> AlbumResponse | ArtistResponse:
        """Find existing entity or create new one"""
        try:
            external_id = request.get_external_id()
            if not external_id:
                raise ValidationError(
                    error_code=4000,
                    message="External ID must be provided"
                )

            # Get the external source ID first
            external_source_id = await self.external_ref_repo.get_external_source_id(request.source)

            if request.entity_type == EntityTypeEnum.ALBUM:
                # Try to find existing album first
                entity = await self.external_ref_repo.find_album_by_external_id(external_id, external_source_id)
                if not entity:
                    # Album doesn't exist, create it
                    try:
                        entity = await self.external_ref_repo.create_album(AlbumCreate(
                            external_album_id=external_id,
                            title=request.title,
                            image_url=request.image_url,
                            external_source_id=external_source_id
                        ))
                    except Exception as create_error:
                        # If creation fails (e.g., due to race condition), try to find again
                        logger.warning(f"Failed to create album, trying to find existing: {str(create_error)}")
                        entity = await self.external_ref_repo.find_album_by_external_id(external_id, external_source_id)
                        if not entity:
                            # Still not found, re-raise the original error
                            raise create_error
                
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
                entity = await self.external_ref_repo.find_artist_by_external_id(external_id, external_source_id)
                if not entity:
                    # Artist doesn't exist, create it
                    try:
                        entity = await self.external_ref_repo.create_artist(ArtistCreate(
                            external_artist_id=external_id,
                            title=request.title,
                            image_url=request.image_url,
                            external_source_id=external_source_id
                        ))
                    except Exception as create_error:
                        # If creation fails (e.g., due to race condition), try to find again
                        logger.warning(f"Failed to create artist, trying to find existing: {str(create_error)}")
                        entity = await self.external_ref_repo.find_artist_by_external_id(external_id, external_source_id)
                        if not entity:
                            # Still not found, re-raise the original error
                            raise create_error
                
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
            existing = await self.wishlist_repo.find_by_user_and_external_id(user_id, external_id, request.entity_type)
            is_new = False
            if existing:
                logger.info(f"Item already in wishlist, returning existing: {existing}")
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
            entity_type_id = await self.external_ref_repo.get_entity_type_id(request.entity_type)
            external_source_id = await self.external_ref_repo.get_external_source_id(request.source)
            
            result = await self.wishlist_repo.add_to_wishlist(
                user_id=user_id,
                external_id=external_id,
                entity_type=request.entity_type,
                title=request.title,
                image_url=request.image_url,
                external_source_id=external_source_id
            )

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
            wishlist_item = await self.wishlist_repo.get_by_id(wishlist_id)
            if not wishlist_item or wishlist_item.user_id != user_id:
                raise ResourceNotFoundError(
                    error_code=4040,
                    message=f"Wishlist item {wishlist_id} not found or not owned by user {user_id}"
                )
            
            result = await self.wishlist_repo.remove_from_wishlist(user_id, wishlist_id)
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

    async def get_user_wishlist(self, user_id: int) -> List[WishlistItemResponse]:
        """Get user's wishlist items"""
        try:
            items = await self.wishlist_repo.get_user_wishlist(user_id)
            
            responses = []
            for item in items:
                try:
                    # Create a dictionary with the item data and computed fields
                    item_dict = {
                        "id": item.id,
                        "user_id": item.user_id,
                        "external_id": item.external_id,
                        "entity_type_id": item.entity_type_id,
                        "external_source_id": item.external_source_id,
                        "title": item.title,
                        "image_url": item.image_url,
                        "created_at": item.created_at,
                        "entity_type": item.entity_type.name.lower() if item.entity_type else "unknown",
                        "source": item.external_source.name.lower() if item.external_source else "unknown"
                    }
                    wishlist_response = WishlistItemResponse.model_validate(item_dict)
                    responses.append(wishlist_response)
                except Exception as e:
                    logger.error(f"Error processing wishlist item {item.id}: {str(e)}")
                    continue
            
            return responses
            
        except Exception as e:
            logger.error(f"Failed to get user wishlist: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get user wishlist",
                details={"error": str(e)}
            ) 