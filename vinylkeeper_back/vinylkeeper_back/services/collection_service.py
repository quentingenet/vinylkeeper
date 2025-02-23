from datetime import datetime, timezone
from typing import List, Tuple
from fastapi import Depends
from sqlalchemy.orm import Session
from vinylkeeper_back.schemas.collection_schemas import CollectionBase, CollectionCreate, Collection
from vinylkeeper_back.repositories.collection_repository import CollectionRepository
from vinylkeeper_back.db.session import get_db

class CollectionService:
            
    def __init__(self, db: Session = Depends(get_db)):
        self.collection_repo = CollectionRepository(db) 
        
    def create_collection(self, new_collection: CollectionCreate, user_id: int) -> bool:
        collection_to_add = CollectionCreate(
            name=new_collection.name,
            description=new_collection.description,
            is_public=new_collection.is_public,
            user_id=user_id,
            registered_at=datetime.now(timezone.utc)
        )
        collection = self.collection_repo.create_collection(collection_to_add)
        return collection is not None

    def get_collections(self, user_id: int, page: int, page_size: int) -> Tuple[List[Collection], int]:
        offset = (page - 1) * page_size
        return self.collection_repo.get_collections(user_id, offset, page_size)

    def switch_area_collection(self, collection_id: int, is_public: bool, user_id: int) -> bool:
        return self.collection_repo.switch_area_collection(collection_id, is_public, user_id)
   
    def delete_collection(self, collection_id: int, user_id: int) -> bool:
        return self.collection_repo.delete_collection(collection_id, user_id)

    def update_collection(self, collection_id: int, request_body: CollectionBase, user_id: int) -> bool:
        return self.collection_repo.update_collection(collection_id, request_body, user_id)