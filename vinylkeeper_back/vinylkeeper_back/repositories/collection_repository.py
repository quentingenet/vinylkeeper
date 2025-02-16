
from requests import Session
from vinylkeeper_back.models.collection_model import Collection
from vinylkeeper_back.schemas.collection_schemas import CollectionBase, CollectionCreate
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
    
def switch_area_collection(db: Session, collection_id: int, is_public: bool, user_id: int) -> bool:
    try:
        collection = db.query(Collection).filter(Collection.id == collection_id, Collection.user_id == user_id).first()
        if collection:
            collection.is_public = is_public
            db.commit()
            db.refresh(collection)
            return True
        else:
            return False
    except Exception as e:
        logger.error(f"Error switching area collection: {e}")
        return False
    
def delete_collection(db: Session, collection_id: int, user_id: int) -> bool:
    try:
        collection = db.query(Collection).filter(Collection.id == collection_id, Collection.user_id == user_id).first()
        if collection:
            db.delete(collection)
            db.commit()
            return True
        else:
            return False
    except Exception as e:
        logger.error(f"Error deleting collection: {e}")
        return False
    
def update_collection(db: Session, collection_id: int, request_body: CollectionBase, user_id: int) -> bool:
    try:
        collection = db.query(Collection).filter(Collection.id == collection_id, Collection.user_id == user_id).first()
        if collection:
            collection.name = request_body.name
            collection.description = request_body.description
            collection.is_public = request_body.is_public
            db.commit()
            db.refresh(collection)
            return True
        else:
            return False
    except Exception as e:
        logger.error(f"Error updating collection: {e}")
        return False