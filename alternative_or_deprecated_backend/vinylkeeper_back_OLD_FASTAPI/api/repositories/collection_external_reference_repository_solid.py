from typing import Optional
from sqlalchemy.orm import Session
from api.models.collection_external_reference_model import CollectionExternalReference
from api.repositories.interfaces import ICollectionExternalReferenceRepository


class CollectionExternalReferenceRepository(ICollectionExternalReferenceRepository):
    """SOLID implementation of Collection External Reference Repository"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def find_by_collection_and_external_ref(
        self, 
        collection_id: int, 
        external_reference_id: int
    ) -> Optional[CollectionExternalReference]:
        return self.db.query(CollectionExternalReference).filter(
            CollectionExternalReference.collection_id == collection_id,
            CollectionExternalReference.external_reference_id == external_reference_id
        ).first()
    
    def create(self, collection_entry: CollectionExternalReference) -> CollectionExternalReference:
        self.db.add(collection_entry)
        self.db.commit()
        self.db.refresh(collection_entry)
        return collection_entry
    
    def delete(self, collection_entry: CollectionExternalReference) -> bool:
        try:
            self.db.delete(collection_entry)
            self.db.commit()
            return True
        except Exception:
            self.db.rollback()
            return False 