from typing import List, Optional
from sqlalchemy.orm import Session
from app.core.enums import EntityTypeEnum, ExternalSourceEnum
from app.core.exceptions import AppException, ValidationError, ServerError, ResourceNotFoundError
from app.models.album_model import Album
from app.models.artist_model import Artist
from app.models.wishlist_model import Wishlist
from app.models.collection_model import Collection
from app.repositories.wishlist_repository import WishlistRepository
from app.repositories.collection_repository import CollectionRepository
from app.repositories.album_repository import AlbumRepository
from app.repositories.artist_repository import ArtistRepository


class ExternalReferenceRepository:
    """Repository for managing external references (Discogs, etc.)"""

    def __init__(self, db: Session):
        self.db = db
        self.wishlist_repo = WishlistRepository(db)
        self.collection_repo = CollectionRepository(db)
        self.album_repo = AlbumRepository(db)
        self.artist_repo = ArtistRepository(db)

    def add_to_wishlist(self, user_id: int, external_id: str, entity_type: EntityTypeEnum) -> bool:
        """Add an item to user's wishlist"""
        try:
            # Check if item already exists in wishlist
            existing = self.wishlist_repo.find_by_user_and_external_id(
                user_id, external_id, entity_type)
            if existing:
                return True

            # Check if entity exists in our database
            entity = None
            if entity_type == EntityTypeEnum.ALBUM:
                entity = self.album_repo.find_by_external_id(external_id)
            else:
                entity = self.artist_repo.find_by_external_id(external_id)

            if not entity:
                raise ValidationError(
                    error_code=4000,
                    message="Entity not found",
                    details={
                        "entity_type": entity_type,
                        "resource_id": external_id
                    }
                )

            # Add to wishlist
            wishlist_item = Wishlist(
                user_id=user_id,
                external_id=external_id,
                entity_type=entity_type
            )
            self.db.add(wishlist_item)
            self.db.commit()
            return True

        except Exception as e:
            self.db.rollback()
            raise ServerError(
                error_code=5000,
                message="Failed to add to wishlist",
                details={"error": str(e)}
            )

    def add_to_collection(self, collection_id: int, external_id: str, entity_type: EntityTypeEnum) -> bool:
        """Add an item to collection"""
        try:
            # Get collection
            collection = self.collection_repo.find_by_id(collection_id)
            if not collection:
                raise ResourceNotFoundError(
                    resource_type="Collection",
                    resource_id=collection_id
                )

            # Check if entity exists in our database
            entity = None
            if entity_type == EntityTypeEnum.ALBUM:
                entity = self.album_repo.find_by_external_id(external_id)
            else:
                entity = self.artist_repo.find_by_external_id(external_id)

            if not entity:
                raise ValidationError(
                    error_code=4000,
                    message="Entity not found",
                    details={
                        "entity_type": entity_type,
                        "resource_id": external_id
                    }
                )

            # Add to collection
            if entity_type == EntityTypeEnum.ALBUM:
                if entity not in collection.albums:
                    collection.albums.append(entity)
            else:
                if entity not in collection.artists:
                    collection.artists.append(entity)

            self.db.commit()
            return True

        except Exception as e:
            self.db.rollback()
            raise ServerError(
                error_code=5000,
                message="Failed to add to collection",
                details={"error": str(e)}
            )

    def remove_from_wishlist(self, user_id: int, external_id: str, entity_type: EntityTypeEnum) -> bool:
        """Remove an item from user's wishlist"""
        try:
            # Find wishlist item
            wishlist = self.wishlist_repo.find_by_user_and_external_id(
                user_id, external_id, entity_type)
            if not wishlist:
                return True

            # Remove from wishlist
            self.db.delete(wishlist)
            self.db.commit()
            return True

        except Exception as e:
            self.db.rollback()
            raise ServerError(
                error_code=5000,
                message="Failed to remove from wishlist",
                details={"error": str(e)}
            )

    def remove_from_collection(self, collection_id: int, external_id: str, entity_type: EntityTypeEnum) -> bool:
        """Remove an item from collection"""
        try:
            # Find entity
            entity = None
            if entity_type == EntityTypeEnum.ALBUM:
                entity = self.album_repo.find_by_external_id(external_id)
            else:
                entity = self.artist_repo.find_by_external_id(external_id)

            if not entity:
                return True

            # Remove from collection
            if entity_type == EntityTypeEnum.ALBUM:
                if entity in collection.albums:
                    collection.albums.remove(entity)
            else:
                if entity in collection.artists:
                    collection.artists.remove(entity)

            self.db.commit()
            return True

        except Exception as e:
            self.db.rollback()
            raise ServerError(
                error_code=5000,
                message="Failed to remove from collection",
                details={"error": str(e)}
            )

    def get_user_wishlist(self, user_id: int) -> List[Wishlist]:
        """Get a user's wishlist"""
        try:
            return self.wishlist_repo.find_by_user_id(user_id)
        except AppException:
            raise
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to get user wishlist",
                details={"error": str(e)}
            )

    def get_collection_items(self, collection_id: int) -> dict:
        """Get items from a collection"""
        try:
            collection = self.collection_repo.find_by_id(collection_id)
            if not collection:
                raise ResourceNotFoundError(
                    resource_type="Collection",
                    resource_id=collection_id
                )

            return {
                "albums": collection.albums,
                "artists": collection.artists
            }
        except AppException:
            raise
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to get collection items",
                details={"error": str(e)}
            )
