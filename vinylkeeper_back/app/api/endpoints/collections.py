from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.schemas.musicals_schemas.collection_schemas import Collection, CollectionCreate, CollectionUpdate
from app.services.collection_service import (
    get_collection,
    get_collections,
    create_collection,
    update_collection,
    delete_collection
)
from app.utils.utils_jwt import get_db, get_current_user
from app.models.user_model import User

router = APIRouter()


@router.get("/", response_model=List[Collection])
def read_collections(skip: int = 0, limit: int = 10, db: Session = Depends(get_db),
                     current_user: User = Depends(get_current_user)):
    collections = get_collections(db, skip=skip, limit=limit)
    return collections


@router.get("/{collection_id}", response_model=Collection)
def read_collection(collection_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_collection = get_collection(db, collection_id)
    if db_collection is None:
        raise HTTPException(status_code=404, detail="Collection not found")
    return db_collection


@router.post("/", response_model=Collection, status_code=status.HTTP_201_CREATED)
def create_collection_endpoint(collection: CollectionCreate, db: Session = Depends(get_db),
                               current_user: User = Depends(get_current_user)):
    return create_collection(db, collection, current_user.id)


@router.put("/{collection_id}", response_model=Collection)
def update_collection_endpoint(collection_id: int, collection: CollectionUpdate, db: Session = Depends(get_db),
                               current_user: User = Depends(get_current_user)):
    db_collection = update_collection(db, collection_id, collection)
    if db_collection is None:
        raise HTTPException(status_code=404, detail="Collection not found")
    return db_collection


@router.delete("/{collection_id}", response_model=Collection)
def delete_collection_endpoint(collection_id: int, db: Session = Depends(get_db),
                               current_user: User = Depends(get_current_user)):
    db_collection = delete_collection(db, collection_id)
    if db_collection is None:
        raise HTTPException(status_code=404, detail="Collection not found")
    return db_collection
