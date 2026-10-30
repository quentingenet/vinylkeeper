from typing import List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import String, and_, case, cast, func, literal_column, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from app.models.album_model import Album
from app.models.wishlist_model import Wishlist
from app.repositories.work_queries import work_key
from app.models.reference_data.entity_types import EntityType
from app.core.enums import EntityTypeEnum
from app.core.exceptions import ServerError
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

    async def add_to_wishlist(
        self,
        user_id: int, external_id: str, entity_type: EntityTypeEnum,
        title: str, image_url: str, external_source_id: int
    ) -> Wishlist:
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
            await self._add_entity(wishlist_item, flush=True)
            await self._refresh_entity(wishlist_item)
            return wishlist_item
        except IntegrityError:
            # Concurrent insert hit uq_wishlist_user_entity_source: let the
            # caller (WishlistService.add_to_wishlist) treat this as an
            # already-existing item instead of masking it as a 500.
            raise
        except SQLAlchemyError as e:
            logger.error(f"Error adding to wishlist: {str(e)}", exc_info=True)
            raise ServerError(
                error_code=5000,
                message="Failed to add to wishlist",
                details={}
            )

    async def create(self, wishlist: Wishlist) -> Wishlist:
        """Create a new wishlist item without committing (transaction managed by service)."""
        try:
            await self._add_entity(wishlist, flush=True)
            await self._refresh_entity(wishlist)
            return wishlist
        except SQLAlchemyError as e:
            logger.error(
                f"Error creating wishlist item for user {wishlist.user_id}: {str(e)}", exc_info=True)
            raise ServerError(
                error_code=5000,
                message="Failed to create wishlist item",
                details={}
            )

    async def find_by_user_and_external_id(
        self, user_id: int, external_id: str, entity_type: EntityTypeEnum
    ) -> Optional[Wishlist]:
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
        except SQLAlchemyError as e:
            logger.error(
                f"Database error in find_by_user_and_external_id: {str(e)}", exc_info=True)
            raise ServerError(
                error_code=5000,
                message="Failed to find wishlist item",
                details={}
            )

    async def get_by_id(self, wishlist_id: int) -> Optional[Wishlist]:
        """Get a wishlist item by ID"""
        try:
            query = select(Wishlist).filter(Wishlist.id == wishlist_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except SQLAlchemyError as e:
            logger.error(
                f"Error retrieving wishlist item {wishlist_id}: {str(e)}", exc_info=True)
            raise ServerError(
                error_code=5000,
                message="Failed to get wishlist item by ID",
                details={}
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
        except SQLAlchemyError as e:
            logger.error(
                f"Error retrieving wishlist item {wishlist_id} with relations: {str(e)}", exc_info=True)
            raise ServerError(
                error_code=5000,
                message="Failed to get wishlist item by ID with relations",
                details={}
            )

    async def get_user_wishlist_paginated(
        self, user_id: int, page: int = 1, limit: int = 8,
        search: Optional[str] = None, sort_order: str = "newest"
    ) -> Tuple[List[Tuple[str, List[Tuple[Wishlist, str, Optional[Album]]]]], int]:
        """
        One page of works of the wishlist, as in the collections: the pressings of one Discogs master
        are one card. Returns (work key, [(Wishlist, entity type name, Album or None) first added first])
        and the number of works. An artist, or an album not known yet, is a work of its own.
        Newest: works by their last added pressing; oldest: by their first one.
        """
        try:
            # The album of a wishlist row: same release, same source, and an album row (an artist id may
            # be the same number as a release id)
            album_join = and_(
                Album.external_album_id == Wishlist.external_id,
                Album.external_source_id == Wishlist.external_source_id,
                EntityType.name == EntityTypeEnum.ALBUM.value,
            )
            work = func.coalesce(
                case((Album.id.is_not(None), work_key(Album))),
                literal_column("'item:'", String) + cast(Wishlist.id, String),
            )
            filters = [Wishlist.user_id == user_id]
            if search and search.strip():
                filters.append(Wishlist.title.ilike(f"%{search.strip()}%"))

            def from_wishlist(query):
                return (query.select_from(Wishlist)
                        .join(EntityType, EntityType.id == Wishlist.entity_type_id)
                        .outerjoin(Album, album_join)
                        .where(*filters))

            groups = from_wishlist(select(
                work.label("work"),
                func.min(Wishlist.created_at).label("first_added"),
                func.max(Wishlist.created_at).label("last_added"),
            )).group_by(work).subquery()
            order = (groups.c.first_added.asc() if sort_order == "oldest" else groups.c.last_added.desc())
            page_keys = list((await self.db.execute(
                select(groups.c.work).order_by(order, groups.c.work).offset((page - 1) * limit).limit(limit)
            )).scalars().all())
            total = (await self.db.execute(select(func.count()).select_from(groups))).scalar() or 0
            if not page_keys:
                return [], total

            rows = (await self.db.execute(
                from_wishlist(select(Wishlist, EntityType.name, Album, work))
                .where(work.in_(page_keys))
                .order_by(Wishlist.created_at.asc(), Wishlist.id)
            )).all()
            pressings: dict[str, list] = {key: [] for key in page_keys}
            for wishlist, entity_type, album, key in rows:
                pressings[key].append((wishlist, entity_type, album))
            return [(key, pressings[key]) for key in page_keys], total
        except SQLAlchemyError as e:
            logger.error(
                f"Error getting paginated wishlist items for user {user_id}: {str(e)}", exc_info=True)
            raise ServerError(
                error_code=5000,
                message="Failed to get paginated wishlist items",
                details={}
            )

    async def get_user_wishlist_all(self, user_id: int) -> List[Wishlist]:
        """Get all wishlist items for a user with relations loaded (for exports)."""
        try:
            from sqlalchemy.orm import selectinload

            query = (
                select(Wishlist)
                .options(
                    selectinload(Wishlist.entity_type),
                    selectinload(Wishlist.external_source),
                )
                .filter(Wishlist.user_id == user_id)
                .order_by(Wishlist.created_at.desc())
            )
            result = await self.db.execute(query)
            return result.scalars().all()
        except SQLAlchemyError as e:
            logger.error(f"Error getting wishlist export data: {str(e)}", exc_info=True)
            raise ServerError(
                error_code=5000,
                message="Failed to get wishlist items",
                details={},
            )

    async def update(self, wishlist: Wishlist) -> Wishlist:
        """Update a wishlist item without committing (transaction managed by service)."""
        try:
            await self._add_entity(wishlist, flush=True)
            await self._refresh_entity(wishlist)
            return wishlist
        except SQLAlchemyError as e:
            logger.error(
                f"Error updating wishlist item {wishlist.id}: {str(e)}", exc_info=True)
            raise ServerError(
                error_code=5000,
                message="Failed to update wishlist item",
                details={}
            )

    async def delete(self, wishlist_id: int) -> bool:
        """Delete a wishlist item without committing (transaction managed by service)."""
        try:
            wishlist = await self.get_by_id(wishlist_id)
            if wishlist:
                await self._delete_entity(wishlist)
                return True
            return False
        except SQLAlchemyError as e:
            logger.error(
                f"Error deleting wishlist item {wishlist_id}: {str(e)}", exc_info=True)
            raise ServerError(
                error_code=5000,
                message="Failed to delete wishlist item",
                details={}
            )
