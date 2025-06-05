from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException
from api.models.external_reference_model import ExternalReference, ExternalSourceEnum, ExternalItemTypeEnum
from api.models.wishlist_model import Wishlist
from api.models.collection_external_reference_model import CollectionExternalReference
from api.repositories.interfaces import IExternalReferenceRepository, IWishlistRepository, ICollectionExternalReferenceRepository
from api.services.validation_service import ValidationService


class ExternalReferenceService:
    """SOLID External Reference Service - Business Logic Layer"""
    
    def __init__(
        self,
        external_ref_repo: IExternalReferenceRepository,
        wishlist_repo: IWishlistRepository,
        collection_external_repo: ICollectionExternalReferenceRepository
    ):
        self.external_ref_repo = external_ref_repo
        self.wishlist_repo = wishlist_repo
        self.collection_external_repo = collection_external_repo
    
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
        existing = self.external_ref_repo.find_by_external_id(external_id, source, item_type)
        
        if existing:
            return existing
            
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
        
        return self.external_ref_repo.create(new_reference)
    
    def add_to_wishlist(
        self, 
        user_id: int, 
        external_id: str, 
        title: str, 
        artist_name: Optional[str] = None, 
        picture_medium: Optional[str] = None
    ) -> bool:
        try:
            external_ref = self.create_or_get_external_reference(
                external_id=external_id,
                source=ExternalSourceEnum.DEEZER,
                item_type=ExternalItemTypeEnum.ALBUM,
                title=title,
                artist_name=artist_name,
                picture_medium=picture_medium
            )
            
            existing_wishlist = self.wishlist_repo.find_by_user_and_external_ref(
                user_id, external_ref.id
            )
            
            if existing_wishlist:
                return True
            
            wishlist_entry = Wishlist(
                user_id=user_id,
                external_reference_id=external_ref.id,
                created_at=datetime.now(timezone.utc)
            )
            
            self.wishlist_repo.create(wishlist_entry)
            return True
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error adding to wishlist: {str(e)}")

    def remove_from_wishlist(self, user_id: int, external_reference_id: int) -> bool:
        try:
            wishlist_entry = self.wishlist_repo.find_by_user_and_external_ref(
                user_id, external_reference_id
            )
            
            if not wishlist_entry:
                return False
            
            return self.wishlist_repo.delete(wishlist_entry)
            
        except Exception as e:
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
        try:
            external_ref = self.create_or_get_external_reference(
                external_id=external_id,
                source=ExternalSourceEnum.DEEZER,
                item_type=item_type,
                title=title,
                artist_name=artist_name,
                picture_medium=picture_medium
            )
            
            existing_entry = self.collection_external_repo.find_by_collection_and_external_ref(
                collection_id, external_ref.id
            )
            
            if existing_entry:
                return True
            
            collection_entry = CollectionExternalReference(
                collection_id=collection_id,
                external_reference_id=external_ref.id,
                created_at=datetime.now(timezone.utc)
            )
            
            self.collection_external_repo.create(collection_entry)
            return True
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error adding to collection: {str(e)}")
    
    def remove_from_collection(self, user_id: int, collection_id: int, external_reference_id: int) -> bool:
        try:
            collection_entry = self.collection_external_repo.find_by_collection_and_external_ref(
                collection_id, external_reference_id
            )
            
            if not collection_entry:
                return False
            
            return self.collection_external_repo.delete(collection_entry)
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error removing from collection: {str(e)}")
    
    def get_user_wishlist_external(self, user_id: int) -> List[ExternalReference]:
        return self.external_ref_repo.get_user_wishlist_items(user_id)
    
    def get_collection_external_items(self, collection_id: int, user_id: int) -> List[ExternalReference]:
        return self.external_ref_repo.get_collection_external_items(collection_id) 