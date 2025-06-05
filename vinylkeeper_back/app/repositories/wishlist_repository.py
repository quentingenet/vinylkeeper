from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.wishlist_model import Wishlist
from app.models.reference_data.entity_types import EntityType
from app.core.enums import EntityTypeEnum
from app.core.exceptions import ResourceNotFoundError, ServerError
from app.core.logging import logger


class WishlistRepository:
    """Repository for managing wishlist items"""

    def __init__(self, db: Session):
        self.db = db

    def _get_entity_type_id(self, entity_type: EntityTypeEnum) -> int:
        """Get the entity type ID from the database"""
        entity_type_record = self.db.query(EntityType).filter(
            EntityType.name == entity_type.value
        ).first()
        if not entity_type_record:
            raise ServerError(
                error_code=5000,
                message=f"Entity type {entity_type.value} not found in database"
            )
        return entity_type_record.id

    def add_to_wishlist(self, user_id: int, external_id: str, entity_type: EntityTypeEnum, title: str, image_url: str, external_source_id: int) -> Wishlist:
        """Add an item to user's wishlist"""
        try:
            entity_type_id = self._get_entity_type_id(entity_type)
            wishlist_item = Wishlist(
                user_id=user_id,
                external_id=external_id,
                entity_type_id=entity_type_id,
                title=title,
                image_url=image_url,
                external_source_id=external_source_id
            )
            self.db.add(wishlist_item)
            self.db.commit()
            self.db.refresh(wishlist_item)
            return wishlist_item
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error adding to wishlist: {str(e)}")
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

    def create(self, wishlist: Wishlist) -> Wishlist:
        """Create a new wishlist item"""
        try:
            self.db.add(wishlist)
            self.db.commit()
            self.db.refresh(wishlist)
            return wishlist
        except Exception as e:
            self.db.rollback()
            raise ServerError(
                error_code=5000,
                message="Failed to create wishlist item",
                details={"error": str(e)}
            )

    def find_by_user_and_external_id(self, user_id: int, external_id: str, entity_type: EntityTypeEnum) -> Optional[Wishlist]:
        """Find a wishlist item by user ID and external ID"""
        try:
            entity_type_id = self._get_entity_type_id(entity_type)
            return self.db.query(Wishlist).filter(
                Wishlist.user_id == user_id,
                Wishlist.external_id == external_id,
                Wishlist.entity_type_id == entity_type_id
            ).first()
        except Exception as e:
            logger.error(f"Database error in find_by_user_and_external_id: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to find wishlist item",
                details={"error": str(e)}
            )

    def get_by_id(self, wishlist_id: int) -> Optional[Wishlist]:
        """Get a wishlist item by ID"""
        try:
            return self.db.query(Wishlist).filter(Wishlist.id == wishlist_id).first()
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to get wishlist item by ID",
                details={"error": str(e)}
            )

    def get_all(self) -> List[Wishlist]:
        """Get all wishlist items"""
        try:
            return self.db.query(Wishlist).all()
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to get all wishlist items",
                details={"error": str(e)}
            )

    def get_by_user_id(self, user_id: int) -> List[Wishlist]:
        """Get all wishlist items for a user"""
        try:
            return self.db.query(Wishlist).filter(Wishlist.user_id == user_id).all()
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to get wishlist items by user ID",
                details={"error": str(e)}
            )

    def update(self, wishlist: Wishlist) -> Wishlist:
        """Update a wishlist item"""
        try:
            self.db.commit()
            self.db.refresh(wishlist)
            return wishlist
        except Exception as e:
            self.db.rollback()
            raise ServerError(
                error_code=5000,
                message="Failed to update wishlist item",
                details={"error": str(e)}
            )

    def delete(self, wishlist_id: int) -> bool:
        """Delete a wishlist item"""
        try:
            wishlist = self.get_by_id(wishlist_id)
            if wishlist:
                self.db.delete(wishlist)
                self.db.commit()
                return True
            return False
        except Exception as e:
            self.db.rollback()
            raise ServerError(
                error_code=5000,
                message="Failed to delete wishlist item",
                details={"error": str(e)}
            )
