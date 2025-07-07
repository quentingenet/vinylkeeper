from fastapi import APIRouter, Depends, HTTPException
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
    CollectionItemResponse
)
from app.core.logging import logger
from app.core.exceptions import (
    ResourceNotFoundError,
    ValidationError,
    ForbiddenError,
    ServerError
)
from app.deps.deps import get_external_reference_service, get_wishlist_service
from app.core.enums import EntityTypeEnum

router = APIRouter()


@router.post("/wishlist/add", response_model=WishlistItemResponse)
async def add_to_wishlist(
    request: AddToWishlistRequest,
    current_user: User = Depends(get_current_user),
    service: WishlistService = Depends(get_wishlist_service)
):
    """Add an item to user's wishlist"""
    try:
        wishlist_item = await service.add_to_wishlist(current_user.id, request)
        return wishlist_item
    except ValidationError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except ServerError as e:
        logger.error(f"Server error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=500, detail="An unexpected error occurred")


@router.delete("/wishlist/{wishlist_id}", response_model=bool)
async def remove_from_wishlist(
    wishlist_id: int,
    current_user: User = Depends(get_current_user),
    service: WishlistService = Depends(get_wishlist_service)
):
    """Remove an item from user's wishlist"""
    try:
        result = await service.remove_from_wishlist(current_user.id, wishlist_id)
        return result
    except ResourceNotFoundError as e:
        logger.error(f"Resource not found: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))
    except ForbiddenError as e:
        logger.error(f"Forbidden: {str(e)}")
        raise HTTPException(status_code=403, detail=str(e))
    except ServerError as e:
        logger.error(f"Server error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=500, detail="An unexpected error occurred")


@router.post("/collection/{collection_id}/add", response_model=CollectionItemResponse)
async def add_to_collection(
    request: AddToCollectionRequest,
    collection_id: int,
    current_user: User = Depends(get_current_user),
    service: ExternalReferenceService = Depends(get_external_reference_service)
):
    """Add an item to user's collection"""
    try:
        collection_item = await service.add_to_collection(
            current_user.id, collection_id, request)
        return collection_item
    except ValidationError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except ResourceNotFoundError as e:
        logger.error(f"Resource not found: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))
    except ForbiddenError as e:
        logger.error(f"Forbidden: {str(e)}")
        raise HTTPException(status_code=403, detail=str(e))
    except ServerError as e:
        logger.error(f"Server error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=500, detail="An unexpected error occurred")


@router.delete("/collection/{collection_id}/remove", response_model=bool)
async def remove_from_collection(
    collection_id: int,
    external_id: str,
    entity_type: str,
    current_user: User = Depends(get_current_user),
    service: ExternalReferenceService = Depends(get_external_reference_service)
):
    """Remove an item from user's collection"""
    try:
        # Convert entity_type string to EntityTypeEnum
        try:
            entity_type_enum = EntityTypeEnum(entity_type)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid entity_type: {entity_type}")
        
        result = await service.remove_from_collection(current_user.id, collection_id, external_id, entity_type_enum)
        return result
    except ResourceNotFoundError as e:
        logger.error(f"Resource not found: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))
    except ForbiddenError as e:
        logger.error(f"Forbidden: {str(e)}")
        raise HTTPException(status_code=403, detail=str(e))
    except ServerError as e:
        logger.error(f"Server error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=500, detail="An unexpected error occurred")


@router.get("/wishlist", response_model=list[WishlistItemResponse])
async def get_user_wishlist(
    user_id: int = None,
    current_user: User = Depends(get_current_user),
    service: WishlistService = Depends(get_wishlist_service)
):
    """Get user's wishlist items. If user_id is provided, get that user's wishlist (for public viewing)"""
    try:
        # If no user_id provided, use current user's ID
        target_user_id = user_id if user_id is not None else current_user.id
        items = await service.get_user_wishlist(target_user_id)
        return items
    except ServerError as e:
        logger.error(f"Server error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=500, detail="An unexpected error occurred")


@router.get("/collection", response_model=list[CollectionItemResponse])
async def get_collection_items(
    current_user: User = Depends(get_current_user),
    service: ExternalReferenceService = Depends(get_external_reference_service)
):
    """Get user's collection items"""
    try:
        items = await service.get_collection_items(current_user.id)
        return items
    except ServerError as e:
        logger.error(f"Server error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=500, detail="An unexpected error occurred")
