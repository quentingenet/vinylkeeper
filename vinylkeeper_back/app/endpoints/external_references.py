from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.utils.auth_utils.auth import get_current_user
from app.models.user_model import User
from app.services.external_reference_service import ExternalReferenceService
from app.services.wishlist_service import WishlistService
from app.schemas.external_reference_schema import (
    AddToWishlistRequest,
    AddToCollectionRequest,
    AddExternalResponse,
    WishlistItemResponse,
    CollectionItemResponse,
    AddToWishlistResponse,
    AddToCollectionResponse
)
from app.core.exceptions import (
    ResourceNotFoundError,
    ValidationError,
    ForbiddenError,
    ServerError
)
from app.deps.deps import get_external_reference_service, get_wishlist_service
from app.core.enums import EntityTypeEnum
from app.utils.endpoint_utils import handle_app_exceptions

router = APIRouter()


@router.post("/wishlist/add", response_model=AddToWishlistResponse)
@handle_app_exceptions
async def add_to_wishlist(
    request: AddToWishlistRequest,
    current_user: User = Depends(get_current_user),
    service: WishlistService = Depends(get_wishlist_service)
):
    """Add an item to user's wishlist"""
    wishlist_item = await service.add_to_wishlist(current_user.id, request)
    return wishlist_item


@router.delete("/wishlist/{wishlist_id}", response_model=bool)
@handle_app_exceptions
async def remove_from_wishlist(
    wishlist_id: int,
    current_user: User = Depends(get_current_user),
    service: WishlistService = Depends(get_wishlist_service)
):
    """Remove an item from user's wishlist"""
    result = await service.remove_from_wishlist(current_user.id, wishlist_id)
    return result


@router.post("/collection/{collection_id}/add", response_model=AddToCollectionResponse)
@handle_app_exceptions
async def add_to_collection(
    request: AddToCollectionRequest,
    collection_id: int,
    current_user: User = Depends(get_current_user),
    service: ExternalReferenceService = Depends(get_external_reference_service)
):
    """Add an item to user's collection"""
    collection_item = await service.add_to_collection(
        current_user.id, collection_id, request)
    return collection_item


@router.delete("/collection/{collection_id}/remove", response_model=bool)
@handle_app_exceptions
async def remove_from_collection(
    collection_id: int,
    external_id: str,
    entity_type: str,
    current_user: User = Depends(get_current_user),
    service: ExternalReferenceService = Depends(get_external_reference_service)
):
    """Remove an item from user's collection"""
    # Convert entity_type string to EntityTypeEnum
    try:
        entity_type_enum = EntityTypeEnum(entity_type)
    except ValueError:
        raise ValidationError(
            error_code=3002,
            message=f"Invalid entity_type: {entity_type}"
        )
    
    result = await service.remove_from_collection(current_user.id, collection_id, external_id, entity_type_enum)
    return result


@router.get("/wishlist", response_model=list[WishlistItemResponse])
@handle_app_exceptions
async def get_user_wishlist(
    user_id: int = None,
    current_user: User = Depends(get_current_user),
    service: WishlistService = Depends(get_wishlist_service)
):
    """Get user's wishlist items. If user_id is provided, get that user's wishlist (for public viewing)"""
    # If no user_id provided, use current user's ID
    target_user_id = user_id if user_id is not None else current_user.id
    items = await service.get_user_wishlist(target_user_id)
    return items


@router.get("/collection", response_model=list[CollectionItemResponse])
@handle_app_exceptions
async def get_collection_items(
    current_user: User = Depends(get_current_user),
    service: ExternalReferenceService = Depends(get_external_reference_service)
):
    """Get user's collection items"""
    items = await service.get_collection_items(current_user.id)
    return items
