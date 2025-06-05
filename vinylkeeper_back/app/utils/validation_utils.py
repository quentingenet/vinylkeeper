from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.collection_model import Collection


def validate_collection_ownership(db: Session, collection_id: int, user_id: int) -> Collection:
    collection = db.query(Collection).filter(
        Collection.id == collection_id,
        Collection.user_id == user_id
    ).first()
    
    if not collection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Collection not found or access denied"
        )
    
    return collection


def validate_collection_access(db: Session, collection_id: int, user_id: int) -> Collection:
    collection = db.query(Collection).filter(
        Collection.id == collection_id
    ).filter(
        (Collection.user_id == user_id) | (Collection.is_public == True)
    ).first()
    
    if not collection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Collection not found"
        )
    
    return collection 