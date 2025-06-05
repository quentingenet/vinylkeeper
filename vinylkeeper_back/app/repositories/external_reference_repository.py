from typing import List, Optional, Dict
from sqlalchemy.orm import Session
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


class ExternalReferenceRepository:
    """Repository for managing external references - data access only"""

    def __init__(
        self,
        db: Session,
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

    def get_entity_type_id(self, entity_type: EntityTypeEnum) -> int:
        """Get the entity type ID from the database with caching"""
        cache_key = entity_type.value
        if cache_key in self._entity_type_cache:
            return self._entity_type_cache[cache_key]
        
        entity_type_record = self.db.query(EntityType).filter(
            EntityType.name == cache_key
        ).first()
        if not entity_type_record:
            raise ValidationError(
                error_code=4000,
                message=f"Entity type {cache_key} not found in database"
            )
        
        self._entity_type_cache[cache_key] = entity_type_record.id
        return entity_type_record.id

    def get_external_source_id(self, source_name: str) -> int:
        """Get the external source ID from the database with caching"""
        cache_key = source_name
        if cache_key in self._external_source_cache:
            return self._external_source_cache[cache_key]
        
        external_source = self.db.query(ExternalSource).filter(
            ExternalSource.name == cache_key
        ).first()
        if not external_source:
            raise ValidationError(
                error_code=4000,
                message=f"External source {cache_key} not found",
                details={"source": source_name}
            )
        
        self._external_source_cache[cache_key] = external_source.id
        return external_source.id

    def create_album(self, album_data: AlbumCreate) -> Album:
        """Create a new album"""
        try:
            album = Album(
                external_album_id=album_data.external_album_id,
                title=album_data.title,
                image_url=album_data.image_url,
                external_source_id=album_data.external_source_id
            )
            return self.album_repo.create(album)
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to create album",
                details={"error": str(e)}
            )

    def create_artist(self, artist_data: ArtistCreate) -> Artist:
        """Create a new artist"""
        try:
            artist = Artist(
                external_artist_id=artist_data.external_artist_id,
                title=artist_data.title,
                image_url=artist_data.image_url,
                external_source_id=artist_data.external_source_id
            )
            return self.artist_repo.create(artist)
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to create artist",
                details={"error": str(e)}
            )

    def find_album_by_external_id(self, external_id: str) -> Optional[Album]:
        """Find an album by its external ID"""
        return self.album_repo.find_by_external_id(external_id)

    def find_artist_by_external_id(self, external_id: str) -> Optional[Artist]:
        """Find an artist by its external ID"""
        return self.artist_repo.find_by_external_id(external_id)

    def create_wishlist_item(self, wishlist_data: dict) -> Wishlist:
        """Create a new wishlist item"""
        try:
            wishlist_item = Wishlist(**wishlist_data)
            self.db.add(wishlist_item)
            self.db.commit()
            self.db.refresh(wishlist_item)
            return wishlist_item
        except Exception as e:
            self.db.rollback()
            raise ServerError(
                error_code=5000,
                message="Failed to create wishlist item",
                details={"error": str(e)}
            )

    def find_wishlist_item(self, user_id: int, external_id: str, entity_type: EntityTypeEnum) -> Optional[Wishlist]:
        """Find a wishlist item by user ID and external ID"""
        return self.wishlist_repo.find_by_user_and_external_id(user_id, external_id, entity_type)

    def remove_wishlist_item(self, wishlist_item: Wishlist) -> bool:
        """Remove a wishlist item"""
        try:
            self.db.delete(wishlist_item)
            self.db.commit()
            return True
        except Exception as e:
            self.db.rollback()
            raise ServerError(
                error_code=5000,
                message="Failed to remove wishlist item",
                details={"error": str(e)}
            )

    def get_user_wishlist(self, user_id: int) -> List[Wishlist]:
        """Get a user's wishlist"""
        return self.wishlist_repo.find_by_user_id(user_id)

    def find_collection_by_id(self, collection_id: int) -> Optional[Collection]:
        """Find a collection by ID"""
        return self.collection_repo.get_by_id(collection_id)

    def add_album_to_collection(self, collection: Collection, album: Album, album_data: Optional[dict] = None) -> None:
        """Add an album to a collection with optional album state data"""
        try:
            # Check if album is already in collection
            existing = self.db.query(CollectionAlbum).filter(
                CollectionAlbum.collection_id == collection.id,
                CollectionAlbum.album_id == album.id
            ).first()
            
            if not existing:
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
                self.db.commit()
        except Exception as e:
            self.db.rollback()
            raise ServerError(
                error_code=5000,
                message="Failed to add album to collection",
                details={"error": str(e)}
            )

    def add_artist_to_collection(self, collection: Collection, artist: Artist) -> None:
        """Add an artist to a collection"""
        try:
            # Check if artist is already in collection
            if artist not in collection.artists:
                collection.artists.append(artist)
                self.db.commit()
        except Exception as e:
            self.db.rollback()
            raise ServerError(
                error_code=5000,
                message="Failed to add artist to collection",
                details={"error": str(e)}
            )

    def remove_album_from_collection(self, collection: Collection, album: Album) -> None:
        """Remove an album from a collection"""
        try:
            # Find and delete the collection album association
            collection_album = self.db.query(CollectionAlbum).filter(
                CollectionAlbum.collection_id == collection.id,
                CollectionAlbum.album_id == album.id
            ).first()
            
            if collection_album:
                self.db.delete(collection_album)
                self.db.commit()
        except Exception as e:
            self.db.rollback()
            raise ServerError(
                error_code=5000,
                message="Failed to remove album from collection",
                details={"error": str(e)}
            )

    def remove_artist_from_collection(self, collection: Collection, artist: Artist) -> None:
        """Remove an artist from a collection"""
        try:
            if artist in collection.artists:
                collection.artists.remove(artist)
                self.db.commit()
        except Exception as e:
            self.db.rollback()
            raise ServerError(
                error_code=5000,
                message="Failed to remove artist from collection",
                details={"error": str(e)}
            )

    def get_vinyl_state_id(self, state_name: str) -> Optional[int]:
        """Get the vinyl state ID from the database with caching"""
        if not state_name:
            return None
        
        cache_key = state_name.lower()
        if cache_key in self._vinyl_state_cache:
            return self._vinyl_state_cache[cache_key]
        
        vinyl_state = self.db.query(VinylState).filter(
            VinylState.name == cache_key
        ).first()
        if not vinyl_state:
            # For now, let's not throw an error, just return None
            # In the future, we might want to be stricter
            return None
        
        self._vinyl_state_cache[cache_key] = vinyl_state.id
        return vinyl_state.id
