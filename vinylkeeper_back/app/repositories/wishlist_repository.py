from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.wishlist_model import Wishlist
from app.core.enums import EntityTypeEnum
from app.core.exceptions import ResourceNotFoundError, ServerError
from app.core.logging import logger


class WishlistRepository:
    """Repository for managing wishlist items"""

    def __init__(self, db: Session):
        self.db = db

    def add_to_wishlist(self, user_id: int, external_id: str, entity_type: str) -> Wishlist:
        """Add an item to user's wishlist"""
        try:
            wishlist_item = Wishlist(
                user_id=user_id,
                external_id=external_id,
                entity_type=entity_type
            )
            self.db.add(wishlist_item)
            self.db.commit()
            self.db.refresh(wishlist_item)
            return wishlist_item
        except Exception as e:
            self.db.rollback()
            raise ServerError(
                error_code=5000,
                message="Failed to add to wishlist",
                details={"error": str(e)}
            )

    def remove_from_wishlist(self, user_id: int, wishlist_id: int) -> bool:
        """Remove an item from user's wishlist"""
        try:
            logger.info(
                f"Finding wishlist item {wishlist_id} for user {user_id}")
            # Utiliser l'ORM mais désactiver la validation
            wishlist_item = self.db.query(Wishlist).filter(
                Wishlist.id == wishlist_id,
                Wishlist.user_id == user_id
            ).first()

            if not wishlist_item:
                logger.warning(
                    f"Wishlist item {wishlist_id} not found for user {user_id}")
                return False

            logger.info(
                f"Deleting wishlist item {wishlist_id} for user {user_id}")
            # Désactiver temporairement la validation
            Wishlist.validate_external_id = lambda self, key, value: value
            self.db.delete(wishlist_item)
            self.db.commit()
            logger.info(
                f"Successfully deleted wishlist item {wishlist_id} for user {user_id}")
            return True
        except Exception as e:
            logger.error(
                f"Error removing wishlist item {wishlist_id} for user {user_id}: {str(e)}")
            self.db.rollback()
            raise ServerError(
                error_code=5000,
                message="Failed to remove from wishlist",
                details={"error": str(e)}
            )

    def get_user_wishlist(self, user_id: int) -> List[Wishlist]:
        """Get all items in user's wishlist"""
        try:
            return self.db.query(Wishlist).filter(
                Wishlist.user_id == user_id
            ).all()
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to get user wishlist",
                details={"error": str(e)}
            )

    def add_to_collection(self, user_id: int, external_id: str, entity_type: str) -> Wishlist:
        """Add an item to user's collection"""
        try:
            collection_item = Wishlist(
                user_id=user_id,
                external_id=external_id,
                entity_type=entity_type
            )
            self.db.add(collection_item)
            self.db.commit()
            self.db.refresh(collection_item)
            return collection_item
        except Exception as e:
            self.db.rollback()
            raise ServerError(
                error_code=5000,
                message="Failed to add to collection",
                details={"error": str(e)}
            )

    def remove_from_collection(self, user_id: int, collection_id: int) -> bool:
        """Remove an item from user's collection"""
        try:
            collection_item = self.db.query(Wishlist).filter(
                Wishlist.id == collection_id,
                Wishlist.user_id == user_id
            ).first()

            if not collection_item:
                raise ResourceNotFoundError(
                    error_code=4004,
                    message="Collection item not found"
                )

            self.db.delete(collection_item)
            self.db.commit()
            return True
        except Exception as e:
            self.db.rollback()
            raise ServerError(
                error_code=5000,
                message="Failed to remove from collection",
                details={"error": str(e)}
            )

    def get_collection_items(self, user_id: int) -> List[Wishlist]:
        """Get all items in user's collection"""
        try:
            return self.db.query(Wishlist).filter(
                Wishlist.user_id == user_id
            ).all()
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to get collection items",
                details={"error": str(e)}
            )

    def create(self, wishlist: Wishlist) -> Wishlist:
        self.db.add(wishlist)
        self.db.commit()
        self.db.refresh(wishlist)
        return wishlist

    def find_by_user_and_external_id(self, user_id: int, external_id: str, entity_type: str) -> Optional[Wishlist]:
        """Find a wishlist item by user ID and external ID"""
        try:
            return self.db.query(Wishlist).filter(
                Wishlist.user_id == user_id,
                Wishlist.external_id == external_id,
                Wishlist.entity_type == entity_type
            ).first()
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to find wishlist item",
                details={"error": str(e)}
            )

    def delete(self, wishlist: Wishlist) -> bool:
        try:
            self.db.delete(wishlist)
            self.db.commit()
            return True
        except Exception:
            self.db.rollback()
            return False

    def get_by_id(self, wishlist_id: int) -> Optional[Wishlist]:
        """Get a wishlist item by ID"""
        return self.db.query(Wishlist).filter(Wishlist.id == wishlist_id).first()

    def get_all(self) -> List[Wishlist]:
        """Get all wishlist items"""
        return self.db.query(Wishlist).all()

    def get_by_user_id(self, user_id: int) -> List[Wishlist]:
        """Get all wishlist items for a user"""
        return self.db.query(Wishlist).filter(Wishlist.user_id == user_id).all()

    def update(self, wishlist: Wishlist) -> Wishlist:
        """Update a wishlist item"""
        self.db.commit()
        self.db.refresh(wishlist)
        return wishlist

    def delete(self, wishlist_id: int) -> bool:
        """Delete a wishlist item"""
        wishlist = self.get_by_id(wishlist_id)
        if wishlist:
            self.db.delete(wishlist)
            self.db.commit()
            return True
        return False

    def find_by_external_id(self, user_id: int, external_id: str, entity_type: EntityTypeEnum, source: str) -> Optional[Wishlist]:
        """Find a wishlist item by external ID, user ID, entity type and source"""
        return self.db.query(Wishlist).filter(
            Wishlist.user_id == user_id,
            Wishlist.external_id == external_id,
            Wishlist.entity_type == entity_type,
            Wishlist.source == source
        ).first()
