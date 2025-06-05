from fastapi import APIRouter, HTTPException, status, Depends, Path
from sqlalchemy.orm import Session
from typing import Annotated, List
from api.schemas.external_reference_schemas import (
    AddToWishlistRequest, 
    AddToCollectionRequest, 
    AddExternalResponse,
    ExternalReference
)
from api.models.external_reference_model import ExternalItemTypeEnum
from api.core.logging import logger
from api.utils.auth_utils.auth import get_current_user
from api.schemas.user_schemas import User
from api.core.dependencies_solid import (
    get_external_reference_service_solid,
    get_validation_service
)

router = APIRouter()

@router.post("/wishlist/add", status_code=status.HTTP_201_CREATED)
async def add_to_wishlist(
    request: AddToWishlistRequest,
    user: Annotated[User, Depends(get_current_user)],
    service = Depends(get_external_reference_service_solid),
    validation_service = Depends(get_validation_service)
) -> AddExternalResponse:
    """Add external album to user's wishlist"""
    try:
        # Validate request using SOLID validation service
        validation_service.validate_wishlist_request(request)
        
        # Use SOLID service
        success = service.add_to_wishlist(
            user_id=user.id,
            external_id=request.external_id,
            title=request.title,
            artist_name=request.artist_name,
            picture_medium=request.picture_medium
        )
        
        if success:
            logger.info(f"Album {request.title} added to wishlist for user {user.username}")
            return AddExternalResponse(success=True, message="Album added to wishlist successfully")
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to add to wishlist")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding to wishlist: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

@router.post("/collection/{collection_id}/add", status_code=status.HTTP_201_CREATED)
async def add_to_collection(
    request: AddToCollectionRequest,
    user: Annotated[User, Depends(get_current_user)],
    service = Depends(get_external_reference_service_solid),
    validation_service = Depends(get_validation_service),
    collection_id: int = Path(..., gt=0, title="Collection ID", description="The ID of the collection")
) -> AddExternalResponse:
    """Add external item to collection"""
    try:
        # Validate request using SOLID validation service
        validation_service.validate_collection_request(request, collection_id, user.id)
        
        # Use SOLID service
        success = service.add_to_collection(
            user_id=user.id,
            collection_id=collection_id,
            external_id=request.external_id,
            item_type=request.item_type,
            title=request.title,
            artist_name=request.artist_name,
            picture_medium=request.picture_medium
        )
        
        if success:
            item_type_text = "Album" if request.item_type == ExternalItemTypeEnum.ALBUM else "Artist"
            logger.info(f"{item_type_text} {request.title} added to collection {collection_id} for user {user.username}")
            return AddExternalResponse(success=True, message=f"{item_type_text} added to collection successfully")
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to add to collection")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding to collection: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

@router.get("/wishlist", status_code=status.HTTP_200_OK)
async def get_wishlist_external_items(
    user: Annotated[User, Depends(get_current_user)],
    service = Depends(get_external_reference_service_solid)
) -> List[ExternalReference]:
    """Get user's external wishlist items"""
    try:
        # Use SOLID service
        items = service.get_user_wishlist_external(user.id)
        return [ExternalReference.model_validate(item) for item in items]
    except Exception as e:
        logger.error(f"Error fetching wishlist items: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

@router.delete("/wishlist/{item_id}", status_code=status.HTTP_200_OK)
async def remove_from_wishlist(
    user: Annotated[User, Depends(get_current_user)],
    service = Depends(get_external_reference_service_solid),
    validation_service = Depends(get_validation_service),
    item_id: int = Path(..., gt=0, title="Item ID", description="The ID of the external reference to remove from wishlist")
) -> AddExternalResponse:
    """Remove external item from user's wishlist"""
    try:
        # Validate using SOLID validation service
        validation_service.validate_wishlist_item_ownership(user.id, item_id)
        
        # Use SOLID service
        success = service.remove_from_wishlist(user.id, item_id)
        
        if success:
            logger.info(f"Item {item_id} removed from wishlist for user {user.username}")
            return AddExternalResponse(success=True, message="Item removed from wishlist successfully")
        else:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found in wishlist")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing from wishlist: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

@router.get("/collection/{collection_id}", status_code=status.HTTP_200_OK)
async def get_collection_external_items(
    user: Annotated[User, Depends(get_current_user)],
    service = Depends(get_external_reference_service_solid),
    validation_service = Depends(get_validation_service),
    collection_id: int = Path(..., gt=0, title="Collection ID", description="The ID of the collection")
) -> List[ExternalReference]:
    """Get external items in a collection"""
    try:
        # Validate collection access using SOLID validation service
        validation_service.validate_collection_access(user.id, collection_id)
        
        # Use SOLID service
        items = service.get_collection_external_items(collection_id, user.id)
        return [ExternalReference.model_validate(item) for item in items]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching collection items: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

@router.delete("/collection/{collection_id}/{external_reference_id}", status_code=status.HTTP_200_OK)
async def remove_external_item_from_collection(
    user: Annotated[User, Depends(get_current_user)],
    service = Depends(get_external_reference_service_solid),
    validation_service = Depends(get_validation_service),
    collection_id: int = Path(..., gt=0, title="Collection ID", description="The ID of the collection"),
    external_reference_id: int = Path(..., gt=0, title="External Reference ID", description="The ID of the external reference to remove")
) -> AddExternalResponse:
    """Remove external item from collection"""
    try:
        # Validate using SOLID validation service
        validation_service.validate_collection_item_ownership(user.id, collection_id, external_reference_id)
        
        # Use SOLID service
        success = service.remove_from_collection(user.id, collection_id, external_reference_id)
        
        if success:
            logger.info(f"External item {external_reference_id} removed from collection {collection_id} for user {user.username}")
            return AddExternalResponse(success=True, message="Item removed from collection successfully")
        else:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found in collection")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing from collection: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error") 