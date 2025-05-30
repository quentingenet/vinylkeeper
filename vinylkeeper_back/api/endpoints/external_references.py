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
from api.db.session import get_db
from api.utils.auth_utils.auth import get_current_user
from api.services.external_reference_service import ExternalReferenceService
from api.schemas.user_schemas import User

router = APIRouter()

def get_external_reference_service(db: Session = Depends(get_db)) -> ExternalReferenceService:
    return ExternalReferenceService(db)

@router.post("/wishlist/add", status_code=status.HTTP_201_CREATED)
async def add_to_wishlist(
    request: AddToWishlistRequest,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[ExternalReferenceService, Depends(get_external_reference_service)]
) -> AddExternalResponse:
    """Add external album to user's wishlist"""
    try:
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
    service: Annotated[ExternalReferenceService, Depends(get_external_reference_service)],
    collection_id: int = Path(..., gt=0, title="Collection ID", description="The ID of the collection")
) -> AddExternalResponse:
    """Add external item to collection"""
    try:
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
    service: Annotated[ExternalReferenceService, Depends(get_external_reference_service)]
) -> List[ExternalReference]:
    """Get user's external wishlist items"""
    try:
        items = service.get_user_wishlist_external(user.id)
        return [ExternalReference.model_validate(item) for item in items]
    except Exception as e:
        logger.error(f"Error fetching wishlist items: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")

@router.get("/collection/{collection_id}", status_code=status.HTTP_200_OK)
async def get_collection_external_items(
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[ExternalReferenceService, Depends(get_external_reference_service)],
    collection_id: int = Path(..., gt=0, title="Collection ID", description="The ID of the collection")
) -> List[ExternalReference]:
    """Get external items in a collection"""
    try:
        items = service.get_collection_external_items(collection_id, user.id)
        return [ExternalReference.model_validate(item) for item in items]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching collection items: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error") 