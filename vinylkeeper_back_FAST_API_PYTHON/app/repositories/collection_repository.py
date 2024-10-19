from sqlalchemy.orm import Session
from app.models.collection_model import Collection
from app.schemas.musicals_schemas.collection_schemas import CollectionCreate, CollectionUpdate


def get_collection(db: Session, user_id: int, collection_id: int):
    return db.query(Collection).filter(Collection.user_id == user_id).filter(Collection.id == collection_id).first()


def get_collections(db: Session, user_id: int, skip: int = 0, limit: int = 10):
    return db.query(Collection).filter(Collection.user_id == user_id).offset(skip).limit(limit).all()


def create_collection(db: Session, collection: CollectionCreate, user_id: int):
    db_collection = Collection(**collection.model_dump(), user_id=user_id)
    db.add(db_collection)
    db.commit()
    db.refresh(db_collection)
    return db_collection


def update_collection(db: Session, db_collection: Collection, collection_update: CollectionUpdate):
    for key, value in collection_update.model_dump().items():
        setattr(db_collection, key, value)
    db.commit()
    db.refresh(db_collection)
    return db_collection


def delete_collection(db: Session, user_id: int, db_collection: Collection):
    if db_collection.user_id != user_id:
        return None
    db.delete(db_collection)
    db.commit()
    return db_collection
