
from requests import Session
from vinylkeeper_back.models.collection_model import Collection
from vinylkeeper_back.schemas.collection_schemas import CollectionCreate
from vinylkeeper_back.core.logging import logger

def create_collection(db: Session, new_collection: CollectionCreate) -> bool:
    try:
        collection = Collection(**new_collection.model_dump())
        db.add(collection)
        db.commit()
        db.refresh(collection)
        return True
    except Exception as e:
        logger.error(f"Error creating collection: {e}")
        return False

def get_collections(db: Session, user_id: int) -> list[Collection]:
    try:
        collections = db.query(Collection).filter(Collection.user_id == user_id).all()
        return collections
    except Exception as e:
        logger.error(f"Error getting collections: {e}")
        return []