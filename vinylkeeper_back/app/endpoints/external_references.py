from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.utils.auth_utils.auth import get_current_user
from app.models.user_model import User
from app.services.external_reference_service import ExternalReferenceService
from app.schemas.external_reference_schema import (
    AddToWishlistRequest,
    AddToCollectionRequest,
    AddExternalResponse,
    WishlistItemResponse,
    CollectionItemResponse
)
from app.core.logging import logger
from app.core.exceptions import ResourceNotFoundError

router = APIRouter()


@router.post("/wishlist/add", response_model=AddExternalResponse)
async def add_to_wishlist(
    request: AddToWishlistRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add an item to user's wishlist"""
    service = ExternalReferenceService(db)
    try:
        wishlist_item = service.add_to_wishlist(current_user.id, request)
        return AddExternalResponse(
            success=True,
            message=f"Successfully added {request.entity_type} to wishlist"
        )
    except Exception as e:
        return AddExternalResponse(
            success=False,
            message=str(e)
        )


@router.delete("/wishlist/{wishlist_id}", response_model=AddExternalResponse)
async def remove_from_wishlist(
    wishlist_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove an item from user's wishlist"""
    service = ExternalReferenceService(db)
    try:
        logger.info(
            f"Attempting to remove wishlist item {wishlist_id} for user {current_user.id}")
        service.remove_from_wishlist(current_user.id, wishlist_id)
        logger.info(
            f"Successfully removed wishlist item {wishlist_id} for user {current_user.id}")
        return AddExternalResponse(
            success=True,
            message="Successfully removed from wishlist"
        )
    except ResourceNotFoundError as e:
        logger.error(f"Wishlist item not found: {str(e)}")
        return AddExternalResponse(
            success=False,
            message=f"Wishlist item not found: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Failed to remove from wishlist: {str(e)}")
        return AddExternalResponse(
            success=False,
            message=f"Failed to remove from wishlist: {str(e)}"
        )


@router.post("/collection/{collection_id}/add", response_model=AddExternalResponse)
async def add_to_collection(
    request: AddToCollectionRequest,
    collection_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logger.info(
        f"Adding {request.entity_type} to collection {collection_id}")
    """Add an item to user's collection"""
    service = ExternalReferenceService(db)
    try:
        collection_item = service.add_to_collection(
            current_user.id, collection_id, request)
        return AddExternalResponse(
            success=True,
            message=f"Successfully added {request.entity_type} to collection"
        )
    except Exception as e:
        return AddExternalResponse(
            success=False,
            message=str(e)
        )


@router.delete("/collection/{collection_id}/remove", response_model=AddExternalResponse)
async def remove_from_collection(
    collection_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove an item from user's collection"""
    service = ExternalReferenceService(db)
    try:
        service.remove_from_collection(current_user.id, collection_id)
        return AddExternalResponse(
            success=True,
            message="Successfully removed from collection"
        )
    except Exception as e:
        return AddExternalResponse(
            success=False,
            message=str(e)
        )


@router.get("/wishlist", response_model=list[WishlistItemResponse])
async def get_user_wishlist(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's wishlist items"""
    service = ExternalReferenceService(db)
    return service.get_user_wishlist(current_user.id)


@router.get("/collection", response_model=list[CollectionItemResponse])
async def get_collection_items(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's collection items"""
    service = ExternalReferenceService(db)
    return service.get_collection_items(current_user.id)
