from datetime import datetime
from sqlalchemy.orm import Session
from vinylkeeper_back.schemas.collection_schemas import CollectionCreate, Collection
from vinylkeeper_back.repositories.collection_repository import create_collection as create_collection_repository, get_collections as get_collections_repository


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