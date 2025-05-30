from datetime import datetime, timezone
from typing import List, Optional
from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from api.models.external_reference_model import ExternalReference, ExternalSourceEnum, ExternalItemTypeEnum
from api.models.wishlist_model import Wishlist
from api.models.collection_external_reference_model import CollectionExternalReference
from api.db.session import get_db


class ExternalReferenceService:
    
    def __init__(self, db: Session = Depends(get_db)):
        self.db = db
        
    def create_or_get_external_reference(
        self, 
        external_id: str, 
        source: ExternalSourceEnum, 
        item_type: ExternalItemTypeEnum,
        title: str,
        artist_name: Optional[str] = None,
        picture_small: Optional[str] = None,
        picture_medium: Optional[str] = None,
        picture_big: Optional[str] = None
    ) -> ExternalReference:
        """Create or get existing external reference"""
        # Check if already exists
        existing = self.db.query(ExternalReference).filter(
            ExternalReference.external_id == external_id,
            ExternalReference.external_source == source,
            ExternalReference.item_type == item_type
        ).first()
        
        if existing:
            return existing
            
        # Create new reference
        new_reference = ExternalReference(
            external_id=external_id,
            external_source=source,
            item_type=item_type,
            title=title,
            artist_name=artist_name,
            picture_small=picture_small,
            picture_medium=picture_medium,
            picture_big=picture_big,
            created_at=datetime.now(timezone.utc)
        )
        
        self.db.add(new_reference)
        self.db.commit()
        self.db.refresh(new_reference)
        return new_reference
    
    def add_to_wishlist(self, user_id: int, external_id: str, title: str, artist_name: Optional[str] = None, picture_medium: Optional[str] = None) -> bool:
        """Add external album to user's wishlist"""
        try:
            # Create or get external reference
            external_ref = self.create_or_get_external_reference(
                external_id=external_id,
                source=ExternalSourceEnum.DEEZER,
                item_type=ExternalItemTypeEnum.ALBUM,
                title=title,
                artist_name=artist_name,
                picture_medium=picture_medium
            )
            
            # Check if already in wishlist
            existing_wishlist = self.db.query(Wishlist).filter(
                Wishlist.user_id == user_id,
                Wishlist.external_reference_id == external_ref.id
            ).first()
            
            if existing_wishlist:
                return True  # Already in wishlist
            
            # Add to wishlist
            wishlist_entry = Wishlist(
                user_id=user_id,
                external_reference_id=external_ref.id,
                created_at=datetime.now(timezone.utc)
            )
            
            self.db.add(wishlist_entry)
            self.db.commit()
            return True
            
        except Exception as e:
            self.db.rollback()
            raise HTTPException(status_code=500, detail=f"Error adding to wishlist: {str(e)}")

    def remove_from_wishlist(self, user_id: int, external_reference_id: int) -> bool:
        """Remove external item from user's wishlist"""
        try:
            # Find the wishlist entry
            wishlist_entry = self.db.query(Wishlist).filter(
                Wishlist.user_id == user_id,
                Wishlist.external_reference_id == external_reference_id
            ).first()
            
            if not wishlist_entry:
                return False  # Item not found in wishlist
            
            # Remove from wishlist
            self.db.delete(wishlist_entry)
            self.db.commit()
            return True
            
        except Exception as e:
            self.db.rollback()
            raise HTTPException(status_code=500, detail=f"Error removing from wishlist: {str(e)}")
    
    def add_to_collection(
        self, 
        user_id: int, 
        collection_id: int, 
        external_id: str, 
        item_type: ExternalItemTypeEnum,
        title: str, 
        artist_name: Optional[str] = None,
        picture_medium: Optional[str] = None
    ) -> bool:
        """Add external item to collection"""
        try:
            # Verify collection belongs to user
            from api.models.collection_model import Collection
            collection = self.db.query(Collection).filter(
                Collection.id == collection_id,
                Collection.user_id == user_id
            ).first()
            
            if not collection:
                raise HTTPException(status_code=404, detail="Collection not found")
            
            # Create or get external reference
            external_ref = self.create_or_get_external_reference(
                external_id=external_id,
                source=ExternalSourceEnum.DEEZER,
                item_type=item_type,
                title=title,
                artist_name=artist_name,
                picture_medium=picture_medium
            )
            
            # Check if already in collection
            existing_entry = self.db.query(CollectionExternalReference).filter(
                CollectionExternalReference.collection_id == collection_id,
                CollectionExternalReference.external_reference_id == external_ref.id
            ).first()
            
            if existing_entry:
                return True  # Already in collection
            
            # Add to collection
            collection_entry = CollectionExternalReference(
                collection_id=collection_id,
                external_reference_id=external_ref.id,
                created_at=datetime.now(timezone.utc)
            )
            
            self.db.add(collection_entry)
            self.db.commit()
            return True
            
        except HTTPException:
            raise
        except Exception as e:
            self.db.rollback()
            raise HTTPException(status_code=500, detail=f"Error adding to collection: {str(e)}")
    
    def get_user_wishlist_external(self, user_id: int) -> List[ExternalReference]:
        """Get user's external wishlist items"""
        return self.db.query(ExternalReference).join(
            Wishlist, Wishlist.external_reference_id == ExternalReference.id
        ).filter(Wishlist.user_id == user_id).all()
    
    def get_collection_external_items(self, collection_id: int, user_id: int) -> List[ExternalReference]:
        """Get external items in a collection"""
        from api.models.collection_model import Collection
        
        # Verify collection belongs to user or is public
        collection = self.db.query(Collection).filter(
            Collection.id == collection_id
        ).filter(
            (Collection.user_id == user_id) | (Collection.is_public == True)
        ).first()
        
        if not collection:
            raise HTTPException(status_code=404, detail="Collection not found")
        
        return self.db.query(ExternalReference).join(
            CollectionExternalReference, 
            CollectionExternalReference.external_reference_id == ExternalReference.id
        ).filter(CollectionExternalReference.collection_id == collection_id).all() 