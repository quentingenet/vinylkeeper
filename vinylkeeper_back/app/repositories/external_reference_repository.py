from typing import Optional, Dict
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete, func, insert, or_, select, update
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import SQLAlchemyError
from app.models.wishlist_model import Wishlist
from app.models.album_model import Album
from app.models.artist_model import Artist
from app.models.collection_model import Collection
from app.models.reference_data.entity_types import EntityType
from app.models.reference_data.external_sources import ExternalSource
from app.schemas.album_schema import AlbumCreate
from app.schemas.artist_schema import ArtistCreate
from app.core.enums import EntityTypeEnum
from app.core.exceptions import (
    ResourceNotFoundError,
    ValidationError,
    ServerError,
)
from app.core.logging import logger
from app.core.transaction import TransactionalMixin
from app.repositories.wishlist_repository import WishlistRepository
from app.repositories.collection_repository import CollectionRepository
from app.repositories.album_repository import AlbumRepository
from app.repositories.artist_repository import ArtistRepository
from app.repositories.collection_album_repository import CollectionAlbumRepository
from app.models.collection_album import CollectionAlbum, CollectionAlbumCopy
from app.models.association_tables import CollectionArtist


class ExternalReferenceRepository(TransactionalMixin):
    """Repository for managing external references - data access only"""

    def __init__(
        self,
        db: AsyncSession,
        wishlist_repo: WishlistRepository,
        collection_repo: CollectionRepository,
        album_repo: AlbumRepository,
        artist_repo: ArtistRepository,
        collection_album_repo: Optional[CollectionAlbumRepository] = None,
    ):
        self.db = db
        self.wishlist_repo = wishlist_repo
        self.collection_repo = collection_repo
        self.album_repo = album_repo
        self.artist_repo = artist_repo
        self.collection_album_repo = collection_album_repo or CollectionAlbumRepository(db)
        # Cache for entity types and external sources
        self._entity_type_cache: Dict[str, int] = {}
        self._external_source_cache: Dict[str, int] = {}
        self._vinyl_state_cache: Dict[str, int] = {}

    async def get_entity_type_id(self, entity_type: EntityTypeEnum) -> int:
        """Get the entity type ID from the database with caching"""
        cache_key = entity_type.value
        if cache_key in self._entity_type_cache:
            return self._entity_type_cache[cache_key]

        query = select(EntityType).filter(EntityType.name == cache_key)
        result = await self.db.execute(query)
        entity_type_record = result.scalar_one_or_none()
        if not entity_type_record:
            raise ValidationError(
                error_code=4000,
                message=f"Entity type {cache_key} not found in database"
            )

        self._entity_type_cache[cache_key] = entity_type_record.id
        return entity_type_record.id

    async def get_external_source_id(self, source_name: str) -> int:
        """Get the external source ID from the database with caching"""
        cache_key = source_name
        if cache_key in self._external_source_cache:
            return self._external_source_cache[cache_key]

        query = select(ExternalSource).filter(ExternalSource.name == cache_key)
        result = await self.db.execute(query)
        external_source = result.scalar_one_or_none()
        if not external_source:
            raise ValidationError(
                error_code=4000,
                message=f"External source {cache_key} not found",
                details={"source": source_name}
            )

        self._external_source_cache[cache_key] = external_source.id
        return external_source.id

    async def create_album(self, album_data: AlbumCreate) -> Album:
        """Create a new album"""
        try:
            album = Album(
                external_album_id=album_data.external_album_id,
                title=album_data.title,
                image_url=album_data.image_url,
                external_source_id=album_data.external_source_id
            )
            return await self.album_repo.create(album)
        except SQLAlchemyError as e:
            logger.error(
                f"Error creating album with external ID {album_data.external_album_id}: {str(e)}", exc_info=True)
            raise ServerError(
                error_code=5000,
                message="Failed to create album",
                details={}
            )

    async def create_artist(self, artist_data: ArtistCreate) -> Artist:
        """Create a new artist"""
        try:
            artist = Artist(
                external_artist_id=artist_data.external_artist_id,
                title=artist_data.title,
                image_url=artist_data.image_url,
                external_source_id=artist_data.external_source_id
            )
            return await self.artist_repo.create(artist)
        except SQLAlchemyError as e:
            logger.error(
                f"Error creating artist with external ID {artist_data.external_artist_id}: {str(e)}", exc_info=True)
            raise ServerError(
                error_code=5000,
                message="Failed to create artist",
                details={}
            )

    async def find_album_by_external_id(self, external_id: str, external_source_id: int) -> Optional[Album]:
        """Find an album by its external ID and source"""
        return await self.album_repo.get_by_external_id(external_id, external_source_id)

    async def find_artist_by_external_id(self, external_id: str, external_source_id: int) -> Optional[Artist]:
        """Find an artist by its external ID and source"""
        return await self.artist_repo.get_by_external_id(external_id, external_source_id)

    async def find_collection_album_by_external_id(
        self, collection_id: int, external_id: str
    ) -> Optional[CollectionAlbum]:
        """Find a collection album by collection ID and external album ID"""
        try:
            from app.models.collection_album import CollectionAlbum
            from app.models.album_model import Album
            from sqlalchemy import select
            from sqlalchemy.orm import selectinload

            query = select(CollectionAlbum).options(
                selectinload(CollectionAlbum.album)
            ).filter(
                CollectionAlbum.collection_id == collection_id
            ).join(Album).filter(Album.external_album_id == external_id)

            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except SQLAlchemyError as e:
            logger.error(
                f"Error finding collection album by external ID: {str(e)}", exc_info=True)
            raise ServerError(
                error_code=5000,
                message="Failed to find collection album by external ID",
                details={}
            )

    async def find_collection_artist_by_external_id(self, collection_id: int, external_id: str) -> Optional[Artist]:
        """Find a collection artist by collection ID and external artist ID"""
        try:
            from app.models.artist_model import Artist

            query = select(Artist).join(CollectionArtist).filter(
                CollectionArtist.collection_id == collection_id,
                Artist.external_artist_id == external_id
            )

            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except SQLAlchemyError as e:
            logger.error(
                f"Error finding collection artist by external ID: {str(e)}", exc_info=True)
            raise ServerError(
                error_code=5000,
                message="Failed to find collection artist by external ID",
                details={}
            )

    async def create_wishlist_item(self, wishlist_data: dict) -> Wishlist:
        """Create a new wishlist item"""
        try:
            wishlist_item = Wishlist(**wishlist_data)
            await self._add_entity(wishlist_item, flush=True)
            await self._refresh_entity(wishlist_item)
            return wishlist_item
        except SQLAlchemyError as e:
            logger.error(
                f"Error creating wishlist item for user {wishlist_data.get('user_id')}: {str(e)}", exc_info=True)
            raise ServerError(
                error_code=5000,
                message="Failed to create wishlist item",
                details={}
            )

    async def find_wishlist_item(
        self, user_id: int, external_id: str, entity_type: EntityTypeEnum
    ) -> Optional[Wishlist]:
        """Find a wishlist item by user ID and external ID"""
        return await self.wishlist_repo.find_by_user_and_external_id(user_id, external_id, entity_type)

    async def remove_wishlist_item(self, wishlist_item: Wishlist) -> bool:
        """Remove a wishlist item"""
        try:
            await self._delete_entity(wishlist_item)
            return True
        except SQLAlchemyError as e:
            logger.error(
                f"Error removing wishlist item {wishlist_item.id}: {str(e)}", exc_info=True)
            raise ServerError(
                error_code=5000,
                message="Failed to remove wishlist item",
                details={}
            )

    async def find_collection_by_id(self, collection_id: int, load_relations: bool = True) -> Optional[Collection]:
        """Find a collection by ID with optional relations loading"""
        return await self.collection_repo.get_by_id(collection_id, load_relations=load_relations)

    async def add_album_to_collection(
        self, collection: Collection, album: Album, album_data: Optional[dict] = None, is_new_entity: bool = False,
        pressing_confirmed: bool = False, add_copy: bool = False,
    ) -> tuple[CollectionAlbum, bool]:
        """Add an album picked in a search; the rules live in CollectionAlbumRepository.add_or_update."""
        return await self.collection_album_repo.add_or_update(
            collection.id, album.id, album_data or {}, pressing_confirmed=pressing_confirmed, add_copy=add_copy,
        )

    async def find_owned_pressings(
        self, user_id: int, external_source_id: int, external_album_id: str, external_master_id: Optional[str]
    ) -> list[tuple[CollectionAlbum, Album, str, int]]:
        """
        Rows of the user's collections holding this release or another pressing of its master,
        as (collection row, album, collection name, number of copies).
        """
        copies_count = (
            select(func.count(CollectionAlbumCopy.id))
            .where(CollectionAlbumCopy.collection_id == CollectionAlbum.collection_id,
                   CollectionAlbumCopy.album_id == CollectionAlbum.album_id)
            .scalar_subquery()
        )
        same_work = Album.external_album_id == external_album_id
        if external_master_id:
            same_work = or_(same_work, Album.external_master_id == external_master_id)
        query = (
            select(CollectionAlbum, Album, Collection.name, copies_count)
            .join(Album, Album.id == CollectionAlbum.album_id)
            .join(Collection, Collection.id == CollectionAlbum.collection_id)
            .filter(Collection.owner_id == user_id, Album.external_source_id == external_source_id, same_work)
            .order_by(Collection.name, CollectionAlbum.created_at)
        )
        return [(row[0], row[1], row[2], row[3]) for row in (await self.db.execute(query)).all()]

    async def replace_album_in_collection(
        self, collection_id: int, old_album_id: int, new_album_id: int
    ) -> tuple[Album, CollectionAlbum]:
        """
        Point an album of the collection to another release (the actual pressing), keeping
        its copies, their condition and the date it was added. If that release is already
        in the collection, the copies are gathered under it. Returns the new album and its
        collection row, with copies loaded.
        """
        in_collection = CollectionAlbum.collection_id == collection_id
        old = (await self.db.execute(
            select(CollectionAlbum).filter(in_collection, CollectionAlbum.album_id == old_album_id)
        )).scalar_one_or_none()
        if old is None:
            raise ResourceNotFoundError("Album", old_album_id)

        now = datetime.now(timezone.utc)
        if new_album_id == old_album_id:
            await self.db.execute(
                update(CollectionAlbum).where(in_collection, CollectionAlbum.album_id == old_album_id)
                .values(pressing_confirmed=True, updated_at=now))
        else:
            target = (await self.db.execute(
                select(CollectionAlbum).filter(in_collection, CollectionAlbum.album_id == new_album_id)
            )).scalar_one_or_none()
            if target is None:
                await self.db.execute(insert(CollectionAlbum).values(
                    collection_id=collection_id, album_id=new_album_id, created_at=old.created_at,
                    updated_at=now, pressing_confirmed=True))
            else:
                added_at = [d for d in (old.created_at, target.created_at) if d is not None]
                await self.db.execute(
                    update(CollectionAlbum).where(in_collection, CollectionAlbum.album_id == new_album_id)
                    .values(created_at=min(added_at) if added_at else None, updated_at=now,
                            pressing_confirmed=True))
            # Copies first: they reference the collection row through a foreign key
            await self.db.execute(
                update(CollectionAlbumCopy)
                .where(CollectionAlbumCopy.collection_id == collection_id,
                       CollectionAlbumCopy.album_id == old_album_id)
                .values(album_id=new_album_id))
            await self.db.execute(
                delete(CollectionAlbum).where(in_collection, CollectionAlbum.album_id == old_album_id))

        # Rows loaded before these statements (the collection and its albums) are stale now
        self.db.expunge_all()
        album = (await self.db.execute(
            select(Album).options(selectinload(Album.external_source)).filter(Album.id == new_album_id)
        )).scalar_one()
        collection_album = (await self.db.execute(
            select(CollectionAlbum).options(selectinload(CollectionAlbum.copies))
            .filter(in_collection, CollectionAlbum.album_id == new_album_id)
        )).scalar_one()
        return album, collection_album

    async def find_artist_in_collection(self, collection_id: int, artist_id: int) -> Optional[dict]:
        """Find if an artist is already in a collection"""
        try:
            query = select(CollectionArtist).filter(
                CollectionArtist.collection_id == collection_id,
                CollectionArtist.artist_id == artist_id
            )
            result = await self.db.execute(query)
            existing = result.scalar_one_or_none()

            if existing:
                return {
                    "id": artist_id,
                    "collection_id": collection_id,
                    "artist_id": artist_id,
                    "created_at": existing.created_at
                }
            return None
        except SQLAlchemyError as e:
            logger.error(f"Failed to find artist in collection: {str(e)}", exc_info=True)
            return None

    async def add_artist_to_collection(
        self, collection: Collection, artist: Artist, is_new_entity: bool = False
    ) -> dict:
        """Add an artist to a collection"""
        try:
            # Check if artist is already in collection
            existing_query = select(CollectionArtist).filter(
                CollectionArtist.collection_id == collection.id,
                CollectionArtist.artist_id == artist.id
            )
            existing_result = await self.db.execute(existing_query)
            existing = existing_result.scalar_one_or_none()

            if not existing:
                # Create new association with explicit timestamps
                now = datetime.now(timezone.utc)
                collection_artist_obj = CollectionArtist(
                    collection_id=collection.id,
                    artist_id=artist.id,
                    created_at=now,
                    updated_at=now
                )

                await self._add_entity(collection_artist_obj, flush=True)

                created_at = collection_artist_obj.created_at
            else:
                # Update only existing association's updated_at
                # Never modify created_at - it represents the initial addition date
                existing.updated_at = datetime.now(timezone.utc)
                # Preserve created_at if it's None (for old records)
                if existing.created_at is None:
                    existing.created_at = existing.updated_at
                await self._flush_if_needed()

                created_at = existing.created_at if existing.created_at is not None else existing.updated_at

            # Return a dictionary with the necessary information
            return {
                "id": artist.id,
                "collection_id": collection.id,
                "artist_id": artist.id,
                "created_at": created_at
            }
        except SQLAlchemyError as e:
            logger.error(
                f"Failed to add artist {artist.id} to collection {collection.id}: {str(e)}",
                exc_info=True
            )
            raise ServerError(
                error_code=5000,
                message="Failed to add artist to collection",
                details={}
            )

    async def remove_album_from_collection(self, collection: Collection, album: Album) -> None:
        """Remove an album from a collection"""
        try:
            # Find and delete the collection album association
            query = select(CollectionAlbum).filter(
                CollectionAlbum.collection_id == collection.id,
                CollectionAlbum.album_id == album.id
            )
            result = await self.db.execute(query)
            collection_album = result.scalar_one_or_none()

            if collection_album:
                await self._delete_entity(collection_album)
        except SQLAlchemyError:
            raise ServerError(
                error_code=5000,
                message="Failed to remove album from collection",
                details={}
            )

    async def remove_artist_from_collection(self, collection: Collection, artist: Artist) -> None:
        """Remove an artist from a collection"""
        try:
            # Delete from association model
            query = select(CollectionArtist).filter(
                CollectionArtist.collection_id == collection.id,
                CollectionArtist.artist_id == artist.id
            )
            result = await self.db.execute(query)
            collection_artist_obj = result.scalar_one_or_none()

            if collection_artist_obj:
                await self._delete_entity(collection_artist_obj)
        except SQLAlchemyError:
            raise ServerError(
                error_code=5000,
                message="Failed to remove artist from collection",
                details={}
            )

