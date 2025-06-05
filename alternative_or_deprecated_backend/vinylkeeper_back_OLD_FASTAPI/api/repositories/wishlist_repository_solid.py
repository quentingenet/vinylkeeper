from typing import Optional
from sqlalchemy.orm import Session
from api.models.wishlist_model import Wishlist
from api.repositories.interfaces import IWishlistRepository


class WishlistRepository(IWishlistRepository):
    """SOLID implementation of Wishlist Repository"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def find_by_user_and_external_ref(self, user_id: int, external_reference_id: int) -> Optional[Wishlist]:
        return self.db.query(Wishlist).filter(
            Wishlist.user_id == user_id,
            Wishlist.external_reference_id == external_reference_id
        ).first()
    
    def create(self, wishlist_entry: Wishlist) -> Wishlist:
        self.db.add(wishlist_entry)
        self.db.commit()
        self.db.refresh(wishlist_entry)
        return wishlist_entry
    
    def delete(self, wishlist_entry: Wishlist) -> bool:
        try:
            self.db.delete(wishlist_entry)
            self.db.commit()
            return True
        except Exception:
            self.db.rollback()
            return False 