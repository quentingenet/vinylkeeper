from fastapi import APIRouter, HTTPException, status, Depends, Path, Query
from sqlalchemy.orm import Session
from typing import Annotated
from api.schemas.collection_schemas import CollectionBase, CollectionResponse, SwitchAreaRequest
from api.core.logging import logger
from api.db.session import get_db
from api.utils.auth_utils.auth import get_current_user
from api.services.collection_service import CollectionService
from api.schemas.user_schemas import User

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
    service: Annotated[CollectionService, Depends(get_collection_service)],
    page: int = Query(1, gt=0),
    limit: int = Query(3, gt=0, le=100)
):
    collections, total = service.get_collections(user.id, page, limit)
    if not collections and page > 1:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
    
    return {
        "items": [CollectionResponse.model_validate(collection).model_dump() for collection in collections],
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }

@router.get("/public", status_code=status.HTTP_200_OK)
async def get_public_collections(
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[CollectionService, Depends(get_collection_service)],
    page: int = Query(1, gt=0),
    limit: int = Query(10, gt=0, le=100)
):
    collections, total = service.get_public_collections(page, limit, exclude_user_id=user.id)
    
    return {
        "items": [CollectionResponse.model_validate(collection).model_dump() for collection in collections],
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }

@router.get("/{collection_id}", status_code=status.HTTP_200_OK)
async def get_collection_by_id(
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[CollectionService, Depends(get_collection_service)],
    collection_id: int = Path(..., gt=0, title="Collection ID", description="The ID of the collection to retrieve")
):
    collection = service.get_collection_by_id(collection_id, user.id)
    if not collection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found")
    
    return CollectionResponse.model_validate(collection).model_dump()

@router.patch("/area/{collection_id}", status_code=status.HTTP_200_OK)
async def switch_area_collection(
    user: Annotated[User, Depends(get_current_user)],
    request_body: SwitchAreaRequest,
    service: Annotated[CollectionService, Depends(get_collection_service)],
    collection_id: int = Path(..., gt=0, title="Collection ID", description="The ID of the collection to update")
):
    collection_updated = service.switch_area_collection(collection_id, request_body.is_public, user.id)
    if not collection_updated:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to update collection area")
    
    return {"message": "Collection updated successfully"}

@router.delete("/delete/{collection_id}", status_code=status.HTTP_200_OK)
async def delete_collection(
    user: Annotated[User, Depends(get_current_user)],
    service: Annotated[CollectionService, Depends(get_collection_service)],
    collection_id: int = Path(..., gt=0, title="Collection ID", description="The ID of the collection to delete"),
):
    collection_deleted = service.delete_collection(collection_id, user.id)
    if not collection_deleted:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to delete collection")
    
    return {"message": "Collection deleted successfully"}

@router.patch("/update/{collection_id}", status_code=status.HTTP_200_OK)
async def update_collection(
    user: Annotated[User, Depends(get_current_user)],
    request_body: CollectionBase,
    service: Annotated[CollectionService, Depends(get_collection_service)],
    collection_id: int = Path(..., gt=0, title="Collection ID", description="The ID of the collection to update")
):
    collection_updated = service.update_collection(collection_id, request_body, user.id)
    if not collection_updated:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to update collection")
    
    return {"message": "Collection updated successfully"}
