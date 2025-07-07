from typing import List, Optional, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
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
    AppException
)
from app.core.logging import logger
from app.repositories.wishlist_repository import WishlistRepository
from app.repositories.collection_repository import CollectionRepository
from app.repositories.album_repository import AlbumRepository
from app.repositories.artist_repository import ArtistRepository
from app.models.collection_album import CollectionAlbum
from app.models.reference_data.vinyl_state import VinylState
from app.utils.vinyl_state_mapping import VinylStateMapping


class ExternalReferenceRepository:
    """Repository for managing external references - data access only"""

    def __init__(
        self,
        db: AsyncSession,
        wishlist_repo: WishlistRepository,
        collection_repo: CollectionRepository,
        album_repo: AlbumRepository,
        artist_repo: ArtistRepository
    ):
        self.db = db
        self.wishlist_repo = wishlist_repo
        self.collection_repo = collection_repo
        self.album_repo = album_repo
        self.artist_repo = artist_repo
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
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to create album",
                details={"error": str(e)}
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
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to create artist",
                details={"error": str(e)}
            )

    async def find_album_by_external_id(self, external_id: str) -> Optional[Album]:
        """Find an album by its external ID"""
        return await self.album_repo.get_by_external_id(external_id, 1)  # Assuming external_source_id = 1

    async def find_artist_by_external_id(self, external_id: str) -> Optional[Artist]:
        """Find an artist by its external ID"""
        return await self.artist_repo.get_by_external_id(external_id, 1)  # Assuming external_source_id = 1

    async def create_wishlist_item(self, wishlist_data: dict) -> Wishlist:
        """Create a new wishlist item"""
        try:
            wishlist_item = Wishlist(**wishlist_data)
            self.db.add(wishlist_item)
            await self.db.commit()
            await self.db.refresh(wishlist_item)
            return wishlist_item
        except Exception as e:
            await self.db.rollback()
            raise ServerError(
                error_code=5000,
                message="Failed to create wishlist item",
                details={"error": str(e)}
            )

    async def find_wishlist_item(self, user_id: int, external_id: str, entity_type: EntityTypeEnum) -> Optional[Wishlist]:
        """Find a wishlist item by user ID and external ID"""
        return await self.wishlist_repo.get_by_user_and_external_id(user_id, external_id, entity_type)

    async def remove_wishlist_item(self, wishlist_item: Wishlist) -> bool:
        """Remove a wishlist item"""
        try:
            await self.db.delete(wishlist_item)
            await self.db.commit()
            return True
        except Exception as e:
            await self.db.rollback()
            raise ServerError(
                error_code=5000,
                message="Failed to remove wishlist item",
                details={"error": str(e)}
            )

    async def get_user_wishlist(self, user_id: int) -> List[Wishlist]:
        """Get a user's wishlist"""
        return await self.wishlist_repo.get_by_user_id(user_id)

    async def find_collection_by_id(self, collection_id: int) -> Optional[Collection]:
        """Find a collection by ID"""
        return await self.collection_repo.get_by_id(collection_id)

    async def add_album_to_collection(self, collection: Collection, album: Album, album_data: Optional[dict] = None) -> CollectionAlbum:
        """Add an album to a collection with optional album state data"""
        try:
            # Check if album is already in collection
            query = select(CollectionAlbum).filter(
                CollectionAlbum.collection_id == collection.id,
                CollectionAlbum.album_id == album.id
            )
            result = await self.db.execute(query)
            existing = result.scalar_one_or_none()
            
            if existing:
                return existing
            
            # Create new collection album association
            collection_album = CollectionAlbum(
                collection_id=collection.id,
                album_id=album.id
            )
            
            # Add album state data if provided
            if album_data:
                if album_data.get('state_record_id') is not None:
                    collection_album.state_record = album_data['state_record_id']
                if album_data.get('state_cover_id') is not None:
                    collection_album.state_cover = album_data['state_cover_id']
                if album_data.get('acquisition_month_year') is not None:
                    collection_album.acquisition_month_year = album_data['acquisition_month_year']
            
            self.db.add(collection_album)
            await self.db.commit()
            await self.db.refresh(collection_album)
            return collection_album
        except Exception as e:
            await self.db.rollback()
            raise ServerError(
                error_code=5000,
                message="Failed to add album to collection",
                details={"error": str(e)}
            )

    async def add_artist_to_collection(self, collection: Collection, artist: Artist) -> dict:
        """Add an artist to a collection"""
        try:
            # Check if artist is already in collection
            if artist not in collection.artists:
                collection.artists.append(artist)
                await self.db.commit()
            
            # Return a dictionary with the necessary information
            return {
                "id": artist.id,  # Use artist ID as collection item ID
                "collection_id": collection.id,
                "artist_id": artist.id,
                "created_at": collection.created_at  # Use collection creation date
            }
        except Exception as e:
            await self.db.rollback()
            raise ServerError(
                error_code=5000,
                message="Failed to add artist to collection",
                details={"error": str(e)}
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
                await self.db.delete(collection_album)
                await self.db.commit()
        except Exception as e:
            await self.db.rollback()
            raise ServerError(
                error_code=5000,
                message="Failed to remove album from collection",
                details={"error": str(e)}
            )

    async def remove_artist_from_collection(self, collection: Collection, artist: Artist) -> None:
        """Remove an artist from a collection"""
        try:
            if artist in collection.artists:
                collection.artists.remove(artist)
                await self.db.commit()
        except Exception as e:
            await self.db.rollback()
            raise ServerError(
                error_code=5000,
                message="Failed to remove artist from collection",
                details={"error": str(e)}
            )

    async def get_vinyl_state_id(self, state_name: str) -> Optional[int]:
        """Get the vinyl state ID using mapping"""
        return VinylStateMapping.get_id_from_name(state_name)
