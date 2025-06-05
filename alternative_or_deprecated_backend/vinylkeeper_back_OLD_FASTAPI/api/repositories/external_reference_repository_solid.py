from typing import List, Optional
from sqlalchemy.orm import Session
from api.models.external_reference_model import ExternalReference, ExternalSourceEnum, ExternalItemTypeEnum
from api.models.wishlist_model import Wishlist
from api.models.collection_external_reference_model import CollectionExternalReference
from api.repositories.interfaces import IExternalReferenceRepository


class ExternalReferenceRepository(IExternalReferenceRepository):
    """SOLID implementation of External Reference Repository"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def find_by_external_id(
        self, 
        external_id: str, 
        source: ExternalSourceEnum, 
        item_type: ExternalItemTypeEnum
    ) -> Optional[ExternalReference]:
        return self.db.query(ExternalReference).filter(
            ExternalReference.external_id == external_id,
            ExternalReference.external_source == source,
            ExternalReference.item_type == item_type
        ).first()
    
    def create(self, external_reference: ExternalReference) -> ExternalReference:
        self.db.add(external_reference)
        self.db.commit()
        self.db.refresh(external_reference)
        return external_reference
    
    def get_user_wishlist_items(self, user_id: int) -> List[ExternalReference]:
        return self.db.query(ExternalReference).join(
            Wishlist, Wishlist.external_reference_id == ExternalReference.id
        ).filter(Wishlist.user_id == user_id).all()
    
    def get_collection_external_items(self, collection_id: int) -> List[ExternalReference]:
        return self.db.query(ExternalReference).join(
            CollectionExternalReference, 
            CollectionExternalReference.external_reference_id == ExternalReference.id
        ).filter(CollectionExternalReference.collection_id == collection_id).all() 