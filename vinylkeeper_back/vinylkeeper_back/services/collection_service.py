from datetime import datetime
from sqlalchemy.orm import Session
from vinylkeeper_back.schemas.collection_schemas import CollectionBase, CollectionCreate, Collection
from vinylkeeper_back.repositories.collection_repository import (
    create_collection as create_collection_repository,
    get_collections as get_collections_repository,
    switch_area_collection as switch_area_collection_repository,
    delete_collection as delete_collection_repository,
    update_collection as update_collection_repository
)


def create_collection(db: Session, new_collection: CollectionCreate, user_id: int) -> bool:
    collection_to_add = CollectionCreate(
        name=new_collection.name,
        description=new_collection.description,
        is_public=new_collection.is_public,
        user_id=user_id,
        registered_at=datetime.now(),
    )
    collection_created = create_collection_repository(db, collection_to_add)
    if collection_created:
        return True
    else:
        return False
    
def get_collections(db: Session, user_id: int) -> list[Collection]:
    collections = get_collections_repository(db, user_id)
    if collections:
        return collections
    else:
        return []

def switch_area_collection(db: Session, collection_id: int, is_public: bool, user_id: int) -> bool:
    collection_updated = switch_area_collection_repository(db, collection_id, is_public, user_id)
    if collection_updated:
        return True
    else:
        return False
    
def delete_collection(db: Session, collection_id: int, user_id: int) -> bool:
    collection_deleted = delete_collection_repository(db, collection_id, user_id)
    if collection_deleted:
        return True
    else:
        return False

def update_collection(db: Session, collection_id: int, request_body: CollectionBase, user_id: int) -> bool:
    collection_updated = update_collection_repository(db, collection_id, request_body, user_id)
    if collection_updated:
        return True
    else:
        return False