from datetime import datetime, timezone
from typing import Iterable, Optional

from sqlalchemy import delete, exists, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import ExternalSourceEnum
from app.models.album_model import Album
from app.models.collection_album import CollectionAlbum, CollectionAlbumCopy
from app.models.collection_model import Collection
from app.models.discogs_import_model import DiscogsImport
from app.models.reference_data.external_sources import ExternalSource
from app.models.user_model import User
from app.repositories.collection_repository import CollectionRepository

ACTIVE_STATUSES = ("queued", "running")


class DiscogsImportRepository:
    """Imports of Discogs collections and the album rows they write. Callers own the commit."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # Import jobs

    async def find_owned_collection(self, collection_id: int, user_id: int) -> Optional[Collection]:
        return (await self.db.execute(
            select(Collection).where(Collection.id == collection_id, Collection.owner_id == user_id)
        )).scalar_one_or_none()

    async def has_active_import(self, user_id: int) -> bool:
        return bool((await self.db.execute(
            select(exists().where(DiscogsImport.user_id == user_id, DiscogsImport.status.in_(ACTIVE_STATUSES)))
        )).scalar())

    async def create_collection(self, user_id: int, base_name: str, description: str) -> Collection:
        """A new private collection; "base_name 2", "base_name 3"... when the user already has the name."""
        name = await CollectionRepository(self.db).free_name(user_id, base_name)
        collection = Collection(name=name, description=description, is_public=False, owner_id=user_id)
        self.db.add(collection)
        await self.db.flush()
        return collection

    async def delete_empty_collection(self, collection_id: int) -> None:
        """Remove the collection created for a failed import, unless records got into it."""
        if not (await self.db.execute(select(exists().where(CollectionAlbum.collection_id == collection_id)))).scalar():
            await self.db.execute(delete(Collection).where(Collection.id == collection_id))

    async def create_import(
        self, user_id: int, collection_id: int, discogs_username: str, created_collection: bool = False,
        saved_copy: Optional[Collection] = None,
    ) -> DiscogsImport:
        job = DiscogsImport(user_id=user_id, collection_id=collection_id, discogs_username=discogs_username,
                            status="queued", created_collection=created_collection,
                            saved_copy_collection_id=saved_copy.id if saved_copy else None,
                            saved_copy_name=saved_copy.name if saved_copy else None)
        self.db.add(job)
        await self.db.flush()
        await self.db.refresh(job)
        return job

    async def import_labels(self, user_id: int, collection_id: Optional[int]) -> tuple[Optional[str], Optional[str]]:
        """Username and collection name of an import, for the logs (collection None once deleted)."""
        username = (await self.db.execute(select(User.username).where(User.id == user_id))).scalar_one_or_none()
        collection_name = None
        if collection_id is not None:
            collection_name = (await self.db.execute(
                select(Collection.name).where(Collection.id == collection_id))).scalar_one_or_none()
        return username, collection_name

    async def latest_import(self, user_id: int) -> Optional[DiscogsImport]:
        return (await self.db.execute(
            select(DiscogsImport).where(DiscogsImport.user_id == user_id).order_by(DiscogsImport.id.desc()).limit(1)
        )).scalar_one_or_none()

    async def next_queued_import(self) -> Optional[DiscogsImport]:
        return (await self.db.execute(
            select(DiscogsImport).where(DiscogsImport.status == "queued").order_by(DiscogsImport.id).limit(1)
        )).scalar_one_or_none()

    async def has_queued_import(self) -> bool:
        return bool((await self.db.execute(select(exists().where(DiscogsImport.status == "queued")))).scalar())

    async def requeue_running_imports(self) -> int:
        """Imports left running by a stopped worker: only called while holding the import lock."""
        result = await self.db.execute(
            update(DiscogsImport).where(DiscogsImport.status == "running").values(status="queued")
        )
        return result.rowcount

    # Albums

    async def discogs_source_id(self) -> int:
        return (await self.db.execute(
            select(ExternalSource.id).where(ExternalSource.name == ExternalSourceEnum.DISCOGS.value)
        )).scalar_one()

    async def albums_by_external_id(self, source_id: int, external_ids: Iterable[str]) -> dict[str, tuple[int, bool]]:
        """external id -> (album id, still waiting for its Discogs metadata)"""
        rows = (await self.db.execute(
            select(Album.external_album_id, Album.id, Album.enriched_at.is_(None))
            .where(Album.external_source_id == source_id, Album.external_album_id.in_(list(external_ids)))
        )).all()
        return {external_id: (album_id, pending) for external_id, album_id, pending in rows}

    async def insert_albums(self, rows: list[dict]) -> None:
        """New albums with their Discogs metadata. One added meanwhile by a user is left as it is."""
        if not rows:
            return
        now = datetime.now(timezone.utc)
        await self.db.execute(
            insert(Album)
            .values([{**row, "enriched_at": now} for row in rows])
            .on_conflict_do_nothing(constraint="uq_external_album_id_source")
        )

    async def fill_pending_album(self, album_id: int, values: dict) -> None:
        """Metadata of an album still waiting for the enrichment, which now has nothing to fetch."""
        await self.db.execute(
            update(Album).where(Album.id == album_id, Album.enriched_at.is_(None))
            .values(**values, enriched_at=datetime.now(timezone.utc))
        )

    # Collection rows

    async def album_ids_in_collection(self, collection_id: int, album_ids: Iterable[int]) -> set[int]:
        rows = (await self.db.execute(
            select(CollectionAlbum.album_id)
            .where(CollectionAlbum.collection_id == collection_id, CollectionAlbum.album_id.in_(list(album_ids)))
        )).scalars()
        return set(rows)

    async def masters_in_collection(self, collection_id: int) -> set[str]:
        """Works (Discogs masters) of the collection, to tell another pressing of a record already there."""
        rows = (await self.db.execute(
            select(Album.external_master_id).distinct()
            .join(CollectionAlbum, CollectionAlbum.album_id == Album.id)
            .where(CollectionAlbum.collection_id == collection_id, Album.external_master_id.is_not(None))
        )).scalars()
        return set(rows)

    async def album_ids_in_other_collections(
        self, user_id: int, collection_id: int, album_ids: Iterable[int]
    ) -> set[int]:
        rows = (await self.db.execute(
            select(CollectionAlbum.album_id).distinct()
            .join(Collection, Collection.id == CollectionAlbum.collection_id)
            .where(Collection.owner_id == user_id, Collection.id != collection_id,
                   CollectionAlbum.album_id.in_(list(album_ids)))
        )).scalars()
        return set(rows)

    async def add_album_with_copies(self, collection_id: int, album_id: int, copies: int) -> bool:
        """
        The album with one copy per Discogs instance, its pressing to be confirmed by the owner.
        False when it got in the collection meanwhile (added by the owner during the import).
        """
        collection_album = CollectionAlbum.new(collection_id, album_id, pressing_confirmed=False)
        now = collection_album.created_at
        collection_album.copies.extend(
            CollectionAlbumCopy(created_at=now, updated_at=now) for _ in range(copies - 1)
        )
        try:
            async with self.db.begin_nested():
                self.db.add(collection_album)
                await self.db.flush()
        except IntegrityError:
            return False
        return True
