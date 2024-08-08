from sqlalchemy.orm import Session
from app.repositories.collection_repository import (
    get_collection as get_collection_repo,
    get_collections as get_collections_repo,
    create_collection as create_collection_repo,
    update_collection as update_collection_repo,
    delete_collection as delete_collection_repo
)
from app.schemas.musicals_schemas.collection_schemas import CollectionCreate, CollectionUpdate


def get_collection(db: Session, collection_id: int):
    return get_collection_repo(db, collection_id)


def get_collections(db: Session, skip: int = 0, limit: int = 10):
    return get_collections_repo(db, skip, limit)


def create_collection(db: Session, collection: CollectionCreate, user_id: int):
    return create_collection_repo(db, collection, user_id)


def update_collection(db: Session, collection_id: int, collection_update: CollectionUpdate):
    db_collection = get_collection_repo(db, collection_id)
    if db_collection is None:
        return None
    return update_collection_repo(db, db_collection, collection_update)


def delete_collection(db: Session, collection_id: int):
    db_collection = get_collection_repo(db, collection_id)
    if db_collection is None:
        return None
    return delete_collection_repo(db, db_collection)
