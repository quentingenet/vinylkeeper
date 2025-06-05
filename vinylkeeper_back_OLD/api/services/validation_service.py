from sqlalchemy.orm import Session
from fastapi import HTTPException
from api.schemas.external_reference_schemas import AddToWishlistRequest, AddToCollectionRequest


class ValidationService:
    """SOLID Validation Service - Separated Concerns"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def validate_collection_ownership(self, collection_id: int, user_id: int) -> None:
        """Validate that user owns the collection"""
        from api.models.collection_model import Collection
        collection = self.db.query(Collection).filter(
            Collection.id == collection_id,
            Collection.user_id == user_id
        ).first()
        
        if not collection:
            raise HTTPException(
                status_code=404, 
                detail="Collection not found or access denied"
            )
    
    def validate_collection_access(self, collection_id: int, user_id: int) -> None:
        """Validate that user can access the collection (own or public)"""
        from api.models.collection_model import Collection
        collection = self.db.query(Collection).filter(
            Collection.id == collection_id
        ).filter(
            (Collection.user_id == user_id) | (Collection.is_public == True)
        ).first()
        
        if not collection:
            raise HTTPException(
                status_code=404, 
                detail="Collection not found"
            )
    
    def validate_wishlist_request(self, request: AddToWishlistRequest) -> None:
        """Validate wishlist request data"""
        if not request.external_id or not request.external_id.strip():
            raise HTTPException(
                status_code=400,
                detail="External ID is required"
            )
        
        if not request.title or not request.title.strip():
            raise HTTPException(
                status_code=400,
                detail="Title is required"
            )
    
    def validate_collection_request(self, request: AddToCollectionRequest, collection_id: int, user_id: int) -> None:
        """Validate collection request data"""
        if not request.external_id or not request.external_id.strip():
            raise HTTPException(
                status_code=400,
                detail="External ID is required"
            )
        
        if not request.title or not request.title.strip():
            raise HTTPException(
                status_code=400,
                detail="Title is required"
            )
        
        # Validate collection ownership
        self.validate_collection_ownership(collection_id, user_id)
    
    def validate_wishlist_item_ownership(self, user_id: int, item_id: int) -> None:
        """Validate that user owns the wishlist item"""
        from api.models.wishlist_model import Wishlist
        wishlist_item = self.db.query(Wishlist).filter(
            Wishlist.user_id == user_id,
            Wishlist.external_reference_id == item_id
        ).first()
        
        if not wishlist_item:
            raise HTTPException(
                status_code=404,
                detail="Wishlist item not found or access denied"
            )
    
    def validate_collection_item_ownership(self, user_id: int, collection_id: int, external_reference_id: int) -> None:
        """Validate that user owns the collection and item exists in it"""
        # First validate collection ownership
        self.validate_collection_ownership(collection_id, user_id)
        
        # Then validate item exists in collection
        from api.models.collection_external_reference_model import CollectionExternalReference
        collection_item = self.db.query(CollectionExternalReference).filter(
            CollectionExternalReference.collection_id == collection_id,
            CollectionExternalReference.external_reference_id == external_reference_id
        ).first()
        
        if not collection_item:
            raise HTTPException(
                status_code=404,
                detail="Item not found in collection"
            ) 