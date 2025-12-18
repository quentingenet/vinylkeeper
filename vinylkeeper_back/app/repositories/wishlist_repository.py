from typing import List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.wishlist_model import Wishlist
from app.models.reference_data.entity_types import EntityType
from app.core.enums import EntityTypeEnum
from app.core.exceptions import ResourceNotFoundError, ServerError
from app.core.logging import logger
from app.core.transaction import TransactionalMixin


class WishlistRepository(TransactionalMixin):
    """Repository for managing wishlist items"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_entity_type_id(self, entity_type: EntityTypeEnum) -> int:
        """Get the entity type ID from the database"""
        query = select(EntityType).filter(EntityType.name == entity_type.value)
        result = await self.db.execute(query)
        entity_type_record = result.scalar_one_or_none()
        if not entity_type_record:
            raise ServerError(
                error_code=5000,
                message=f"Entity type {entity_type.value} not found in database"
            )
        return entity_type_record.id

    async def add_to_wishlist(self, user_id: int, external_id: str, entity_type: EntityTypeEnum, title: str, image_url: str, external_source_id: int) -> Wishlist:
        """Add an item to user's wishlist without committing (transaction managed by service)."""
        try:
            entity_type_id = await self._get_entity_type_id(entity_type)
            wishlist_item = Wishlist(
                user_id=user_id,
                external_id=external_id,
                entity_type_id=entity_type_id,
                title=title,
                image_url=image_url,
                external_source_id=external_source_id
            )
            # Flush to get the ID
            await self._add_entity(wishlist_item, flush=True)
            await self._refresh_entity(wishlist_item)
            return wishlist_item
        except Exception as e:
            logger.error(f"Error adding to wishlist: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to add to wishlist",
                details={"error": str(e)}
            )

    async def create(self, wishlist: Wishlist) -> Wishlist:
        """Create a new wishlist item without committing (transaction managed by service)."""
        try:
            # Flush to ensure changes are persisted
            await self._add_entity(wishlist, flush=True)
            await self._refresh_entity(wishlist)
            return wishlist
        except Exception as e:
            logger.error(
                f"Error creating wishlist item for user {wishlist.user_id}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to create wishlist item",
                details={"error": str(e)}
            )

    async def find_by_user_and_external_id(self, user_id: int, external_id: str, entity_type: EntityTypeEnum) -> Optional[Wishlist]:
        """Find a wishlist item by user ID and external ID"""
        try:
            entity_type_id = await self._get_entity_type_id(entity_type)
            query = select(Wishlist).filter(
                Wishlist.user_id == user_id,
                Wishlist.external_id == external_id,
                Wishlist.entity_type_id == entity_type_id
            )
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(
                f"Database error in find_by_user_and_external_id: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to find wishlist item",
                details={"error": str(e)}
            )

    async def get_by_id(self, wishlist_id: int) -> Optional[Wishlist]:
        """Get a wishlist item by ID"""
        try:
            query = select(Wishlist).filter(Wishlist.id == wishlist_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(
                f"Error retrieving wishlist item {wishlist_id}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get wishlist item by ID",
                details={"error": str(e)}
            )

    async def get_by_id_with_relations(self, wishlist_id: int) -> Optional[Wishlist]:
        """Get a wishlist item by ID with entity_type and external_source relations loaded"""
        try:
            from sqlalchemy.orm import selectinload
            query = select(Wishlist).options(
                selectinload(Wishlist.entity_type),
                selectinload(Wishlist.external_source)
            ).filter(Wishlist.id == wishlist_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(
                f"Error retrieving wishlist item {wishlist_id} with relations: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get wishlist item by ID with relations",
                details={"error": str(e)}
            )

    async def get_user_wishlist_paginated(self, user_id: int, page: int = 1, limit: int = 8) -> Tuple[List[Wishlist], int]:
        """Get paginated wishlist items for a user (lightweight query, no heavy relations)"""
        try:
            offset = (page - 1) * limit

            query = select(Wishlist).filter(Wishlist.user_id ==
                                            user_id).offset(offset).limit(limit)
            result = await self.db.execute(query)
            items = result.scalars().all()

            count_query = select(func.count(Wishlist.id)).filter(
                Wishlist.user_id == user_id)
            count_result = await self.db.execute(count_query)
            total = count_result.scalar() or 0

            return items, total
        except Exception as e:
            logger.error(
                f"Error getting paginated wishlist items for user {user_id}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get paginated wishlist items",
                details={"error": str(e)}
            )

    async def update(self, wishlist: Wishlist) -> Wishlist:
        """Update a wishlist item without committing (transaction managed by service)."""
        try:
            # Flush to ensure changes are persisted
            await self._add_entity(wishlist, flush=True)
            await self._refresh_entity(wishlist)
            return wishlist
        except Exception as e:
            logger.error(
                f"Error updating wishlist item {wishlist.id}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to update wishlist item",
                details={"error": str(e)}
            )

    async def delete(self, wishlist_id: int) -> bool:
        """Delete a wishlist item without committing (transaction managed by service)."""
        try:
            wishlist = await self.get_by_id(wishlist_id)
            if wishlist:
                await self._delete_entity(wishlist)
                return True
            return False
        except Exception as e:
            logger.error(
                f"Error deleting wishlist item {wishlist_id}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to delete wishlist item",
                details={"error": str(e)}
            )

    async def count_user_wishlist_items(self, user_id: int) -> int:
        """Count user's wishlist items"""
        try:
            query = select(func.count()).filter(Wishlist.user_id == user_id)
            result = await self.db.execute(query)
            return result.scalar()
        except Exception as e:
            logger.error(f"Error counting user wishlist items: {str(e)}")
            return 0
