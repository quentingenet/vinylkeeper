from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.wishlist_model import Wishlist
from app.models.reference_data.entity_types import EntityType
from app.core.enums import EntityTypeEnum
from app.core.exceptions import ResourceNotFoundError, ServerError
from app.core.logging import logger
from app.core.transaction import TransactionalMixin
from app.models.collection_album import CollectionAlbum
from app.models.album_model import Album
from app.models.artist_model import Artist
from app.models.association_tables import collection_artist


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
            await self._add_entity(wishlist_item, flush=True)  # Flush to get the ID
            await self._refresh_entity(wishlist_item)
            return wishlist_item
        except Exception as e:
            logger.error(f"Error adding to wishlist: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to add to wishlist",
                details={"error": str(e)}
            )

    async def remove_from_wishlist(self, user_id: int, wishlist_id: int) -> bool:
        """Remove an item from user's wishlist without committing (transaction managed by service)."""
        try:
            query = select(Wishlist).filter(
                Wishlist.id == wishlist_id,
                Wishlist.user_id == user_id
            )
            result = await self.db.execute(query)
            wishlist_item = result.scalar_one_or_none()

            if not wishlist_item:
                logger.warning(
                    f"Wishlist item {wishlist_id} not found for user {user_id}")
                return False

            await self._delete_entity(wishlist_item)
            return True
        except Exception as e:
            logger.error(
                f"Error removing wishlist item {wishlist_id} for user {user_id}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to remove from wishlist",
                details={"error": str(e)}
            )

    async def get_user_wishlist(self, user_id: int) -> List[Wishlist]:
        """Get all items in user's wishlist"""
        try:
            from sqlalchemy.orm import selectinload
            query = select(Wishlist).options(
                selectinload(Wishlist.entity_type),
                selectinload(Wishlist.external_source)
            ).filter(Wishlist.user_id == user_id)
            result = await self.db.execute(query)
            return result.scalars().all()
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to get user wishlist",
                details={"error": str(e)}
            )

    async def create(self, wishlist: Wishlist) -> Wishlist:
        """Create a new wishlist item without committing (transaction managed by service)."""
        try:
            await self._add_entity(wishlist, flush=True)  # Flush to ensure changes are persisted
            await self._refresh_entity(wishlist)
            return wishlist
        except Exception as e:
            logger.error(f"Error creating wishlist item for user {wishlist.user_id}: {str(e)}")
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
            logger.error(f"Database error in find_by_user_and_external_id: {str(e)}")
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
            logger.error(f"Error retrieving wishlist item {wishlist_id}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get wishlist item by ID",
                details={"error": str(e)}
            )

    async def get_all(self) -> List[Wishlist]:
        """Get all wishlist items"""
        try:
            query = select(Wishlist)
            result = await self.db.execute(query)
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error retrieving all wishlist items: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get all wishlist items",
                details={"error": str(e)}
            )

    async def get_by_user_id(self, user_id: int) -> List[Wishlist]:
        """Get all wishlist items for a user"""
        try:
            from sqlalchemy.orm import selectinload
            query = select(Wishlist).options(
                selectinload(Wishlist.entity_type),
                selectinload(Wishlist.external_source)
            ).filter(Wishlist.user_id == user_id)
            result = await self.db.execute(query)
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error retrieving wishlist items for user {user_id}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get wishlist items by user ID",
                details={"error": str(e)}
            )

    async def update(self, wishlist: Wishlist) -> Wishlist:
        """Update a wishlist item without committing (transaction managed by service)."""
        try:
            await self._add_entity(wishlist, flush=True)  # Flush to ensure changes are persisted
            await self._refresh_entity(wishlist)
            return wishlist
        except Exception as e:
            logger.error(f"Error updating wishlist item {wishlist.id}: {str(e)}")
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
            logger.error(f"Error deleting wishlist item {wishlist_id}: {str(e)}")
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

    async def get_collection_wishlist(self, collection_id: int) -> list[Wishlist]:
        """Get all wishlist items for albums or artists in a collection"""
        try:
            # Get all album external_ids in the collection
            album_query = select(Album.external_album_id).join(CollectionAlbum).filter(CollectionAlbum.collection_id == collection_id)
            album_result = await self.db.execute(album_query)
            album_external_ids = [row[0] for row in album_result.all()]

            # Get all artist external_ids in the collection
            artist_query = select(Artist.external_artist_id).join(collection_artist, collection_artist.c.artist_id == Artist.id).filter(collection_artist.c.collection_id == collection_id)
            artist_result = await self.db.execute(artist_query)
            artist_external_ids = [row[0] for row in artist_result.all()]

            # Get all wishlist items matching these external_ids with relationships loaded
            from sqlalchemy.orm import selectinload
            wishlist_query = select(Wishlist).options(
                selectinload(Wishlist.entity_type),
                selectinload(Wishlist.external_source)
            ).filter(
                (Wishlist.external_id.in_(album_external_ids + artist_external_ids))
            )
            wishlist_result = await self.db.execute(wishlist_query)
            return wishlist_result.scalars().all()
        except Exception as e:
            logger.error(f"Error getting collection wishlist: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get collection wishlist",
                details={"error": str(e)}
            )
