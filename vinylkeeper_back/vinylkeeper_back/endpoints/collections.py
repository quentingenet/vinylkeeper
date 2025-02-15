from fastapi import APIRouter, HTTPException, status, Request, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from vinylkeeper_back.schemas.collection_schemas import CollectionBase, CollectionResponse
from vinylkeeper_back.core.logging import logger
from vinylkeeper_back.db.session import get_db
from vinylkeeper_back.utils.auth_utils.auth import user_finder
from vinylkeeper_back.services.collection_service import create_collection as create_collection_service, get_collections as get_collections_service

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

@router.get("/get")
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
