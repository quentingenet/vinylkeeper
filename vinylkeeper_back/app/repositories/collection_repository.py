from sqlalchemy.orm import Session
from app.models.collection_model import Collection
from app.schemas.musicals_schemas.collection_schemas import CollectionCreate, CollectionUpdate


def get_collection(db: Session, collection_id: int):
    return db.query(Collection).filter(Collection.id == collection_id).first()


def get_collections(db: Session, skip: int = 0, limit: int = 10):
    return db.query(Collection).offset(skip).limit(limit).all()


def create_collection(db: Session, collection: CollectionCreate, user_id: int):
    db_collection = Collection(**collection.dict(), user_id=user_id)
    db.add(db_collection)
    db.commit()
    db.refresh(db_collection)
    return db_collection


def update_collection(db: Session, db_collection: Collection, collection_update: CollectionUpdate):
    for key, value in collection_update.dict().items():
        setattr(db_collection, key, value)
    db.commit()
    db.refresh(db_collection)
    return db_collection


def delete_collection(db: Session, db_collection: Collection):
    db.delete(db_collection)
    db.commit()
    return db_collection
