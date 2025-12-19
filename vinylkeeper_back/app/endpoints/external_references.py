from typing import Optional
from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.utils.auth_utils.auth import get_current_user
from app.models.user_model import User
from app.services.external_reference_service import ExternalReferenceService
from app.services.wishlist_service import WishlistService
from app.services.user_service import UserService
from app.services.collection_service import CollectionService
from app.schemas.external_reference_schema import (
    AddToWishlistRequest,
    AddToCollectionRequest,
    AddExternalResponse,
    WishlistItemResponse,
    CollectionItemResponse,
    AddToWishlistResponse,
    AddToCollectionResponse
)
from app.schemas.wishlist_schema import (
    PaginatedWishlistResponse
)
from app.core.exceptions import (
    ResourceNotFoundError,
    ValidationError,
    ForbiddenError,
    ServerError
)
from app.deps.deps import get_external_reference_service, get_wishlist_service, get_user_service, get_collection_service
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


@router.get("/wishlist", response_model=PaginatedWishlistResponse)
@handle_app_exceptions
async def get_user_wishlist_paginated(
    page: int = Query(1, gt=0, description="Page number"),
    limit: int = Query(8, gt=0, le=50, description="Number of items per page"),
    user_uuid: Optional[str] = Query(
        None, description="User UUID to get wishlist for (defaults to current user)"),
    current_user: User = Depends(get_current_user),
    service: WishlistService = Depends(get_wishlist_service),
    user_service: UserService = Depends(get_user_service),
    collection_service: CollectionService = Depends(get_collection_service)
):
    """
    Get wishlist items with pagination.
    Wishlist visibility follows collection visibility:
    - If user has at least one public collection → wishlist is public
    - If all collections are private → wishlist is private (only owner can view)
    """
    if user_uuid:
        # Convert UUID to user_id
        target_user = await user_service.get_user_by_uuid(user_uuid)
        target_user_id = target_user.id

        # Check if target user has at least one public collection
        # If not, only the owner can view their wishlist
        if target_user_id != current_user.id:
            # Check if user has any public collection using collection_service
            from sqlalchemy import select
            from app.models.collection_model import Collection

            # Get database session from collection_service
            db = collection_service.repository.db

            # Check if user has at least one public collection
            query = select(Collection).filter(
                Collection.owner_id == target_user_id,
                Collection.is_public == True
            ).limit(1)
            result = await db.execute(query)
            has_public_collection = result.scalar_one_or_none() is not None

            if not has_public_collection:
                # All collections are private, so wishlist is private
                raise ForbiddenError(
                    error_code=4003,
                    message="You don't have permission to view this wishlist (user has no public collections)",
                    details={"user_uuid": user_uuid}
                )
    else:
        target_user_id = current_user.id

    response = await service.get_user_wishlist_paginated(target_user_id, page, limit)
    return response.model_dump()


@router.get("/wishlist/{wishlist_id}", response_model=WishlistItemResponse)
@handle_app_exceptions
async def get_wishlist_item_detail(
    wishlist_id: int = Path(..., gt=0, title="Wishlist Item ID"),
    current_user: User = Depends(get_current_user),
    service: WishlistService = Depends(get_wishlist_service)
):
    """Get detailed wishlist item by ID (public - any authenticated user can view)"""
    item = await service.get_wishlist_item_detail(wishlist_id)
    return item.model_dump()


@router.get("/collection", response_model=list[CollectionItemResponse])
@handle_app_exceptions
async def get_collection_items(
    current_user: User = Depends(get_current_user),
    service: ExternalReferenceService = Depends(get_external_reference_service)
):
    """Get user's collection items"""
    items = await service.get_collection_items(current_user.id)
    return items
