from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import SQLAlchemyError
from app.models.collection_album import CollectionAlbum, CollectionAlbumCopy
from app.models.album_model import Album
from app.repositories.work_queries import work_key
from app.utils.vinyl_state_mapping import VinylStateMapping
from app.core.exceptions import (
    ResourceNotFoundError,
    ServerError,
    DuplicateFieldError
)
from app.core.logging import logger
from app.core.transaction import TransactionalMixin


class CollectionAlbumRepository(TransactionalMixin):
    """Repository for managing collection-album associations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, collection_album: CollectionAlbum) -> CollectionAlbum:
        """Create a new collection-album association without committing (transaction managed by service)."""
        try:
            await self._add_entity(collection_album, flush=True)
            await self._refresh_entity(collection_album)
            # copies is lazy="raise": loaded here because the mapper reads it right after this call
            await self.db.refresh(collection_album, attribute_names=["copies"])
            return collection_album
        except SQLAlchemyError as e:
            logger.error(
                f"Error creating collection-album association: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to create collection-album association",
                details={}
            )

    async def update(self, collection_album: CollectionAlbum) -> CollectionAlbum:
        """Update a collection-album association without committing (transaction managed by service)."""
        try:
            await self._add_entity(collection_album, flush=True)
            await self._refresh_entity(collection_album)
            await self.db.refresh(collection_album, attribute_names=["copies"])
            return collection_album
        except SQLAlchemyError as e:
            logger.error(
                f"Error updating collection-album association: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to update collection-album association",
                details={}
            )

    async def delete(self, collection_album: CollectionAlbum) -> bool:
        """Delete a collection-album association without committing (transaction managed by service)."""
        try:
            await self._delete_entity(collection_album)
            return True
        except SQLAlchemyError as e:
            logger.error(
                f"Error deleting collection-album association: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to delete collection-album association",
                details={}
            )

    async def find_by_collection_and_album(self, collection_id: int, album_id: int) -> Optional[CollectionAlbum]:
        """Find a collection-album association by collection and album IDs"""
        try:
            query = select(CollectionAlbum).filter(
                CollectionAlbum.collection_id == collection_id,
                CollectionAlbum.album_id == album_id
            )
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except SQLAlchemyError as e:
            logger.error(
                f"Error finding collection-album association: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to find collection-album association",
                details={}
            )

    async def find_by_collection(self, collection_id: int) -> List[CollectionAlbum]:
        """Find all album associations for a collection"""
        try:
            query = select(CollectionAlbum).filter(
                CollectionAlbum.collection_id == collection_id
            )
            result = await self.db.execute(query)
            return result.scalars().all()
        except SQLAlchemyError as e:
            logger.error(f"Error finding collection albums: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to find collection albums",
                details={}
            )

    async def find_by_album(self, album_id: int) -> List[CollectionAlbum]:
        """Find all collection associations for an album"""
        try:
            query = select(CollectionAlbum).filter(
                CollectionAlbum.album_id == album_id
            )
            result = await self.db.execute(query)
            return result.scalars().all()
        except SQLAlchemyError as e:
            logger.error(f"Error finding album collections: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to find album collections",
                details={}
            )

    @staticmethod
    def _state_id(field: str, state) -> Optional[int]:
        if state is None:
            return None
        name = state.value if hasattr(state, "value") else str(state)
        state_id = VinylStateMapping.get_id_from_name(name)
        if not state_id:
            logger.warning(f"Invalid {field} value: {name}")
        return state_id

    @classmethod
    def apply_copy_data(cls, copy: CollectionAlbumCopy, data: dict) -> None:
        """Set the fields present in data (state names or enums), leave the others untouched."""
        for field in ("state_record", "state_cover"):
            if field in data:
                setattr(copy, field, cls._state_id(field, data[field]))
        if "acquisition_month_year" in data:
            copy.acquisition_month_year = data["acquisition_month_year"]
        copy.updated_at = datetime.now(timezone.utc)

    async def find_with_copies(self, collection_id: int, album_id: int) -> Optional[CollectionAlbum]:
        query = (
            select(CollectionAlbum)
            .options(selectinload(CollectionAlbum.copies))
            .filter(CollectionAlbum.collection_id == collection_id, CollectionAlbum.album_id == album_id)
            # Copies may have changed in this session (added, deleted): always reload them
            .execution_options(populate_existing=True)
        )
        return (await self.db.execute(query)).scalar_one_or_none()

    async def add_copy(self, collection_album: CollectionAlbum, data: dict) -> CollectionAlbum:
        now = datetime.now(timezone.utc)
        copy = CollectionAlbumCopy(collection_id=collection_album.collection_id,
                                   album_id=collection_album.album_id, created_at=now)
        self.apply_copy_data(copy, data)
        collection_album.updated_at = now
        await self._add_entity(copy, flush=True)
        return await self._reload_copies(collection_album)

    async def update_copy(self, collection_album: CollectionAlbum, copy: CollectionAlbumCopy,
                          data: dict) -> CollectionAlbum:
        self.apply_copy_data(copy, data)
        collection_album.updated_at = copy.updated_at
        await self.db.flush()
        return await self._reload_copies(collection_album)

    async def delete_copy(self, collection_album: CollectionAlbum, copy: CollectionAlbumCopy) -> CollectionAlbum:
        collection_album.updated_at = datetime.now(timezone.utc)
        await self._delete_entity(copy)
        await self.db.flush()
        return await self._reload_copies(collection_album)

    async def _reload_copies(self, collection_album: CollectionAlbum) -> CollectionAlbum:
        await self.db.refresh(collection_album, attribute_names=["copies"])
        return collection_album

    async def confirm_pressing(self, collection_album: CollectionAlbum) -> CollectionAlbum:
        collection_album.pressing_confirmed = True
        collection_album.updated_at = datetime.now(timezone.utc)
        await self.db.flush()
        return collection_album

    async def get_vinyl_state_id(self, state_name: str) -> int | None:
        """Get vinyl state ID by name using mapping"""
        return VinylStateMapping.get_id_from_name(state_name)

    async def get_vinyl_state_name(self, state_id: int) -> Optional[str]:
        """Get vinyl state name by ID using mapping"""
        return VinylStateMapping.get_name_from_id(state_id)

    async def get_collection_albums_paginated(
        self, collection_id: int, page: int = 1, limit: int = 12, sort_order: str = "newest"
    ) -> tuple[List[tuple], int]:
        """Get paginated albums for a collection with metadata, sorted by collection_album.created_at"""
        try:
            # Calculate offset
            offset = (page - 1) * limit

            # Determine sort order
            if sort_order == "oldest":
                order_clause = CollectionAlbum.created_at.asc().nullslast()
            else:  # default to newest
                order_clause = CollectionAlbum.created_at.desc().nullslast()

            # Query to get albums with collection metadata, sorted by collection_album.created_at
            query = (
                select(Album, CollectionAlbum)
                .join(CollectionAlbum, Album.id == CollectionAlbum.album_id)
                .options(
                    selectinload(Album.external_source),
                    selectinload(CollectionAlbum.copies)
                )
                .filter(CollectionAlbum.collection_id == collection_id)
                .order_by(order_clause)
                .offset(offset)
                .limit(limit)
            )

            result = await self.db.execute(query)
            albums_with_metadata = result.all()

            # Get total count
            count_query = select(func.count(CollectionAlbum.album_id)).filter(
                CollectionAlbum.collection_id == collection_id
            )
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            return albums_with_metadata, total

        except SQLAlchemyError as e:
            logger.error(
                f"Error getting collection albums paginated: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get collection albums paginated",
                details={}
            )

    async def get_collection_records_paginated(
        self, collection_id: int, page: int = 1, limit: int = 12, sort_order: str = "newest"
    ) -> tuple[list[tuple[str, list[tuple]]], int]:
        """
        One page of works (all pressings of a Discogs master are one record), as
        (work key, [(Album, CollectionAlbum) first added first]), and the number of works.
        Newest: works by their last added pressing; oldest: by their first one.
        """
        try:
            work = work_key().label("work")
            groups = (
                select(work, func.min(CollectionAlbum.created_at).label("first_added"),
                       func.max(CollectionAlbum.created_at).label("last_added"))
                .select_from(CollectionAlbum)
                .join(Album, Album.id == CollectionAlbum.album_id)
                .where(CollectionAlbum.collection_id == collection_id)
                .group_by(work)
                .subquery()
            )
            order = (groups.c.first_added.asc().nullslast() if sort_order == "oldest"
                     else groups.c.last_added.desc().nullslast())
            page_keys = list((await self.db.execute(
                select(groups.c.work).order_by(order, groups.c.work).offset((page - 1) * limit).limit(limit)
            )).scalars().all())
            total = (await self.db.execute(select(func.count()).select_from(groups))).scalar() or 0
            if not page_keys:
                return [], total

            rows = (await self.db.execute(
                select(Album, CollectionAlbum, work_key())
                .join(CollectionAlbum, Album.id == CollectionAlbum.album_id)
                .options(selectinload(Album.external_source), selectinload(CollectionAlbum.copies))
                .where(CollectionAlbum.collection_id == collection_id, work_key().in_(page_keys))
                .order_by(CollectionAlbum.created_at.asc().nullsfirst(), Album.id)
            )).all()
            pressings: dict[str, list[tuple]] = {key: [] for key in page_keys}
            for album, collection_album, key in rows:
                pressings[key].append((album, collection_album))
            return [(key, pressings[key]) for key in page_keys], total
        except SQLAlchemyError as e:
            logger.error(f"Error getting collection records paginated: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get collection records",
                details={}
            )

    async def get_album_with_metadata(self, collection_id: int, album_id: int) -> Optional[Album]:
        """Get an album with its collection metadata"""
        try:
            query = select(Album).join(
                CollectionAlbum, Album.id == CollectionAlbum.album_id
            ).options(
                selectinload(Album.external_source)
            ).filter(
                CollectionAlbum.collection_id == collection_id,
                Album.id == album_id
            )

            result = await self.db.execute(query)
            return result.scalar_one_or_none()

        except SQLAlchemyError as e:
            logger.error(f"Error getting album with metadata: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get album with metadata",
                details={}
            )

    async def add_album_to_collection(self, collection_id: int, album_id: int, metadata: dict) -> CollectionAlbum:
        """Add an album to a collection with metadata"""
        try:
            # Check if association already exists
            existing = await self.find_by_collection_and_album(collection_id, album_id)
            if existing:
                # Album already in collection, update both album's and association's updated_at
                stmt = update(Album).where(
                    Album.id == album_id).values(updated_at=func.now())
                await self.db.execute(stmt)
                existing.updated_at = datetime.now(timezone.utc)
                await self.db.flush()
                raise DuplicateFieldError(
                    field="album",
                    value=f"collection_{collection_id}_album_{album_id}"
                )

            # Create new association with explicit timestamps, and its first copy
            now = datetime.now(timezone.utc)
            first_copy = CollectionAlbumCopy(created_at=now, updated_at=now)
            self.apply_copy_data(first_copy, metadata)
            collection_album = CollectionAlbum(
                collection_id=collection_id,
                album_id=album_id,
                created_at=now,
                updated_at=now,
                copies=[first_copy],
            )

            # Update album's updated_at when adding to collection
            stmt = update(Album).where(
                Album.id == album_id).values(updated_at=func.now())
            await self.db.execute(stmt)

            return await self.create(collection_album)

        except DuplicateFieldError:
            raise
        except SQLAlchemyError as e:
            logger.error(f"Error adding album to collection: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to add album to collection",
                details={}
            )

    async def update_album_metadata(self, collection_id: int, album_id: int, metadata: dict) -> CollectionAlbum:
        """Update album metadata in a collection"""
        try:
            collection_album = await self.find_with_copies(collection_id, album_id)
            if not collection_album:
                raise ResourceNotFoundError("Album", album_id)

            # Clients unaware of copies edit the first one
            self.apply_copy_data(collection_album.first_copy(), metadata)

            # Update only updated_at when modifying metadata
            # Never modify created_at - it represents the initial addition date
            collection_album.updated_at = datetime.now(timezone.utc)
            # Preserve created_at if it's None (for old records)
            if collection_album.created_at is None:
                collection_album.created_at = collection_album.updated_at

            return await self.update(collection_album)

        except ResourceNotFoundError:
            raise
        except SQLAlchemyError as e:
            logger.error(f"Error updating album metadata: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to update album metadata",
                details={}
            )

    async def remove_album_from_collection(self, collection_id: int, album_id: int) -> bool:
        """Remove an album from a collection"""
        try:
            collection_album = await self.find_by_collection_and_album(collection_id, album_id)
            if not collection_album:
                logger.warning(f"Album {album_id} not found in collection {collection_id}, skipping delete")
                return False

            await self.delete(collection_album)
            return True

        except SQLAlchemyError as e:
            logger.error(f"Error removing album from collection: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to remove album from collection",
                details={}
            )

    async def get_collection_albums(self, collection_id: int) -> List[tuple]:
        """Get all albums in a collection with metadata, by title: pressings of a record end up side by side"""
        try:
            query = (
                select(Album, CollectionAlbum)
                .join(CollectionAlbum, Album.id == CollectionAlbum.album_id)
                .options(
                    selectinload(Album.external_source),
                    selectinload(CollectionAlbum.copies)
                )
                .filter(CollectionAlbum.collection_id == collection_id)
                .order_by(func.lower(Album.title), CollectionAlbum.created_at, Album.id)
            )

            result = await self.db.execute(query)
            albums = result.all()
            return albums

        except SQLAlchemyError as e:
            logger.error(f"Error getting collection albums: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get collection albums",
                details={}
            )

    async def get_collection_album_metadata(self, collection_id: int, album_id: int) -> Optional[CollectionAlbum]:
        """Get collection album metadata for a specific album in a collection"""
        try:
            query = (
                select(CollectionAlbum)
                .options(
                    selectinload(CollectionAlbum.copies)
                )
                .filter(
                    CollectionAlbum.collection_id == collection_id,
                    CollectionAlbum.album_id == album_id
                )
            )

            result = await self.db.execute(query)
            return result.scalar_one_or_none()

        except SQLAlchemyError as e:
            logger.error(f"Error getting collection album metadata: {str(e)}")
            return None
