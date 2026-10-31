from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import SQLAlchemyError
from app.models.collection_album import CollectionAlbum, CollectionAlbumCopy
from app.models.album_model import Album
from app.repositories.work_queries import work_key
from app.utils.vinyl_state_mapping import VinylStateMapping
from app.core.exceptions import ServerError
from app.core.logging import logger
from app.core.transaction import TransactionalMixin


class CollectionAlbumRepository(TransactionalMixin):
    """Repository for managing collection-album associations"""

    def __init__(self, db: AsyncSession):
        self.db = db

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

    @classmethod
    def edit_copy(cls, copy: CollectionAlbumCopy, data: dict) -> None:
        """Change the condition of a copy already saved: its updated_at moves on."""
        cls.apply_copy_data(copy, data)
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

    async def add_or_update(
        self, collection_id: int, album_id: int, data: dict, *, pressing_confirmed: bool = False,
        add_copy: bool = False,
    ) -> tuple[CollectionAlbum, bool]:
        """
        Add an album picked in a search. Already there: another copy when add_copy, otherwise
        the given condition goes to the first copy.
        Returns the collection row, with copies loaded, and whether it is new.
        """
        try:
            existing = await self.find_with_copies(collection_id, album_id)
            if existing is None:
                collection_album = CollectionAlbum.new(collection_id, album_id, pressing_confirmed)
                self.apply_copy_data(collection_album.first_copy(), data)
                await self._add_entity(collection_album, flush=True)
                return collection_album, True

            if add_copy:
                now = datetime.now(timezone.utc)
                copy = CollectionAlbumCopy(created_at=now, updated_at=now)
                self.apply_copy_data(copy, data)
                existing.copies.append(copy)
            elif data:
                self.edit_copy(existing.first_copy(), data)
            # Picked again with its pressing details in sight; a confirmed pressing never goes back
            if pressing_confirmed:
                existing.pressing_confirmed = True
            # created_at is the first addition date: only updated_at moves
            existing.updated_at = datetime.now(timezone.utc)
            if existing.created_at is None:
                existing.created_at = existing.updated_at
            await self.db.flush()
            return existing, False
        except SQLAlchemyError as e:
            logger.error(f"Error adding album {album_id} to collection {collection_id}: {str(e)}", exc_info=True)
            raise ServerError(
                error_code=5000,
                message="Failed to add album to collection",
                details={}
            )

    async def add_copy(self, collection_album: CollectionAlbum, data: dict) -> CollectionAlbum:
        now = datetime.now(timezone.utc)
        copy = CollectionAlbumCopy(collection_id=collection_album.collection_id,
                                   album_id=collection_album.album_id, created_at=now, updated_at=now)
        self.apply_copy_data(copy, data)
        collection_album.updated_at = now
        await self._add_entity(copy, flush=True)
        return await self._reload_copies(collection_album)

    async def update_copy(self, collection_album: CollectionAlbum, copy: CollectionAlbumCopy,
                          data: dict) -> CollectionAlbum:
        self.edit_copy(copy, data)
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
