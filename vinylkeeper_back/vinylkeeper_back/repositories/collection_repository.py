from requests import Session
from vinylkeeper_back.models.collection_model import Collection
from vinylkeeper_back.schemas.collection_schemas import CollectionBase, CollectionCreate
from vinylkeeper_back.core.logging import logger

class CollectionRepository:
    
    def __init__(self, db: Session):
        self.db = db
        
    def create_collection(self, new_collection: CollectionCreate) -> Collection | None:
        try:
            collection = Collection(**new_collection.model_dump())
            self.db.add(collection)
            self.db.commit()
            self.db.refresh(collection)
            return collection
        except Exception as e:
            logger.error(f"Error creating collection: {e}")
            self.db.rollback()
            return None

    def get_collections(self, user_id: int) -> list[Collection]:
        try:
            return self.db.query(Collection).filter(Collection.user_id == user_id).all()
        except Exception as e:
            logger.error(f"Error getting collections for user {user_id}: {e}")
            raise
        
    def switch_area_collection(self, collection_id: int, is_public: bool, user_id: int) -> bool:
        try:
            collection = self.db.query(Collection).filter(Collection.id == collection_id, Collection.user_id == user_id).first()
            if not collection:
                return False
            collection.is_public = is_public
            self.db.commit()
            return True
        except Exception as e:
            logger.error(f"Error switching area collection {collection_id}: {e}")
            self.db.rollback()
            return False
        
    def delete_collection(self, collection_id: int, user_id: int) -> bool:
        try:
            collection = self.db.query(Collection).filter(Collection.id == collection_id, Collection.user_id == user_id).first()
            if not collection:
                return False
            self.db.delete(collection)
            self.db.commit()
            return True
        except Exception as e:
            logger.error(f"Error deleting collection {collection_id}: {e}")
            self.db.rollback()
            return False
        
    def update_collection(self, collection_id: int, request_body: CollectionBase, user_id: int) -> bool:
        try:
            collection = self.db.query(Collection).filter(Collection.id == collection_id, Collection.user_id == user_id).first()
            if not collection:
                return False
            collection.name = request_body.name
            collection.description = request_body.description
            collection.is_public = request_body.is_public
            self.db.commit()
            return True
        except Exception as e:
            logger.error(f"Error updating collection {collection_id}: {e}")
            self.db.rollback()
            return False
