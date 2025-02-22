from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from typing import Annotated
from vinylkeeper_back.schemas.collection_schemas import CollectionBase, CollectionResponse, SwitchAreaRequest
from vinylkeeper_back.core.logging import logger
from vinylkeeper_back.db.session import get_db
from vinylkeeper_back.utils.auth_utils.auth import get_current_user
from vinylkeeper_back.services.collection_service import CollectionService
from vinylkeeper_back.schemas.user_schemas import User

router = APIRouter()
    
def get_collection_service(db: Session = Depends(get_db)) -> CollectionService:
    return CollectionService(db)

@router.post("/add", status_code=status.HTTP_201_CREATED)
async def create_collection(
    new_collection: CollectionBase,
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[CollectionService, Depends(get_collection_service)]
):
    collection_created = service.create_collection(new_collection, user.id)
    if not collection_created:
        logger.warning(f"Failed to create collection: {new_collection.name} for user {user.username}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create collection")
    
    logger.info(f"Collection created successfully: {new_collection.name} for user {user.username}")
    return {"message": "Collection created successfully"}

@router.get("/", status_code=status.HTTP_200_OK)
async def get_collections(
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[CollectionService, Depends(get_collection_service)]
):
    collections = service.get_collections(user.id)
    if not collections:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No collections found")
    
    return [CollectionResponse.from_orm(collection).model_dump() for collection in collections]

@router.patch("/area/{collection_id}", status_code=status.HTTP_200_OK)
async def switch_area_collection(
    user: Annotated[User, Depends(get_current_user)],
    request_body: SwitchAreaRequest,
    collection_id: int,
    service: Annotated[CollectionService, Depends(get_collection_service)]
):
    collection_updated = service.switch_area_collection(collection_id, request_body.is_public, user.id)
    if not collection_updated:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to update collection area")
    
    return {"message": "Collection updated successfully"}

@router.delete("/delete/{collection_id}", status_code=status.HTTP_200_OK)
async def delete_collection(
    user: Annotated[User, Depends(get_current_user)],
    collection_id: int,
    service: Annotated[CollectionService, Depends(get_collection_service)]
):
    collection_deleted = service.delete_collection(collection_id, user.id)
    if not collection_deleted:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to delete collection")
    
    return {"message": "Collection deleted successfully"}

@router.patch("/update/{collection_id}", status_code=status.HTTP_200_OK)
async def update_collection(
    user: Annotated[User, Depends(get_current_user)],
    request_body: CollectionBase,
    collection_id: int,
    service: Annotated[CollectionService, Depends(get_collection_service)]
):
    collection_updated = service.update_collection(collection_id, request_body, user.id)
    if not collection_updated:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to update collection")
    
    return {"message": "Collection updated successfully"}
