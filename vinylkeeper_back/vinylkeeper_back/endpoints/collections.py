from fastapi import APIRouter, HTTPException, status, Request, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from vinylkeeper_back.schemas.collection_schemas import CollectionBase, CollectionResponse, SwitchAreaRequest
from vinylkeeper_back.core.logging import logger
from vinylkeeper_back.db.session import get_db
from vinylkeeper_back.utils.auth_utils.auth import user_finder
from vinylkeeper_back.services.collection_service import (
    create_collection as create_collection_service,
    get_collections as get_collections_service,
    switch_area_collection as switch_area_collection_service,
    delete_collection as delete_collection_service,
    update_collection as update_collection_service
)

router = APIRouter()

@router.post("/add")
async def create_collection( request: Request, new_collection: CollectionBase, db: Session = Depends(get_db)):
    try:
        user = user_finder(request, db)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
        else:
            collection_created = create_collection_service(db, new_collection, user.id)
            if collection_created:
                logger.info(f"Collection created successfully: {new_collection.name} for user: {user.username}")
                return JSONResponse(status_code=status.HTTP_201_CREATED, content={"message": "Collection created successfully"})
            else:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create collection")
    except HTTPException as e:
        raise e

@router.get("/")
async def get_collections(request: Request, db: Session = Depends(get_db)):
    try:
        user = user_finder(request, db)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
        else:
            collections = get_collections_service(db, user.id)
            if collections: 
                collections_data = [CollectionResponse.from_orm(collection).dict() for collection in collections]
                return collections_data
            else:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No collections found")
    except HTTPException as e:
        raise e

@router.patch("/area/{collection_id}")
async def switch_area_collection( request: Request, request_body: SwitchAreaRequest, collection_id: int, db: Session = Depends(get_db)):
    try:
        is_public = request_body.is_public
        user = user_finder(request, db)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
        else:
            collection_updated = switch_area_collection_service(db, collection_id, is_public, user.id)
            if collection_updated:
                return JSONResponse(status_code=status.HTTP_200_OK, content={"message": "Collection updated successfully"})
            else:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to update collection")
    except HTTPException as e:
        raise e
    
@router.delete("/delete/{collection_id}")
async def delete_collection(request: Request, collection_id: int, db: Session = Depends(get_db)):
    try:
        user = user_finder(request, db)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
        else:
            collection_deleted = delete_collection_service(db, collection_id, user.id)
            if collection_deleted:
                return JSONResponse(status_code=status.HTTP_200_OK, content={"message": "Collection deleted successfully"})
            else:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to delete collection")
    except HTTPException as e:
        raise e

@router.patch("/update/{collection_id}")
async def update_collection(request: Request, request_body: CollectionBase, collection_id: int, db: Session = Depends(get_db)):
    try:
        user = user_finder(request, db)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
        else:
            collection_updated = update_collection_service(db, collection_id, request_body, user.id)
            if collection_updated:
                return JSONResponse(status_code=status.HTTP_200_OK, content={"message": "Collection updated successfully"})
            else:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to update collection")
    except HTTPException as e:
        raise e