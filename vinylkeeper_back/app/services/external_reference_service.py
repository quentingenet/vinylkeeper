from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import insert
from app.models.wishlist_model import Wishlist
from app.models.album_model import Album
from app.models.artist_model import Artist
from app.models.collection_model import Collection
from app.models.association_tables import collection_artist
from app.repositories.wishlist_repository import WishlistRepository
from app.repositories.album_repository import AlbumRepository
from app.repositories.artist_repository import ArtistRepository
from app.repositories.collection_repository import CollectionRepository
from app.schemas.external_reference_schema import (
    AddToWishlistRequest,
    AddToCollectionRequest,
    WishlistItemResponse,
    CollectionItemResponse
)
from app.core.exceptions import ValidationError, ServerError, ResourceNotFoundError, ForbiddenError
from app.core.logging import logger
from app.core.enums import EntityTypeEnum
from app.models.association_tables import collection_album


class ExternalReferenceService:
    """Service for managing external references"""

    def __init__(self, db: Session):
        self.db = db
        self.wishlist_repo = WishlistRepository(db)
        self.album_repo = AlbumRepository(db)
        self.artist_repo = ArtistRepository(db)
        self.collection_repo = CollectionRepository(db)

    def _to_dict(self, obj: Any) -> Dict[str, Any]:
        """Convert SQLAlchemy object to dictionary"""
        if not obj:
            return {}
        return {
            column.name: getattr(obj, column.name)
            for column in obj.__table__.columns
        }

    def add_to_wishlist(self, user_id: int, request: AddToWishlistRequest) -> WishlistItemResponse:
        """Add an album or artist to the wishlist"""
        try:
            # Get the appropriate external ID based on entity type
            external_id = request.get_external_id()
            if not external_id:
                raise ValidationError(
                    error_code=4000,
                    message="External ID must be provided"
                )

            logger.info(
                f"Adding {request.entity_type} with ID {external_id} to wishlist for user {user_id}")

            # Check if item already exists in wishlist
            existing_item = self.wishlist_repo.find_by_external_id(
                user_id=user_id,
                external_id=external_id,
                entity_type=request.entity_type,
                source=request.source
            )
            if existing_item:
                logger.info(
                    f"Item already exists in wishlist with ID {existing_item.id}")
                return WishlistItemResponse(
                    id=existing_item.id,
                    user_id=existing_item.user_id,
                    external_id=existing_item.external_id,
                    entity_type=existing_item.entity_type,
                    title=existing_item.title,
                    image_url=existing_item.image_url,
                    source=existing_item.source,
                    created_at=existing_item.created_at
                )

            # Create wishlist item
            wishlist_data = {
                "user_id": user_id,
                "external_id": external_id,
                "entity_type": request.entity_type,
                "title": request.title,
                "image_url": request.image_url,
                "source": request.source
            }
            wishlist_item = self.wishlist_repo.create(
                Wishlist(**wishlist_data))
            logger.info(f"Created wishlist item with ID {wishlist_item.id}")

            return WishlistItemResponse(
                id=wishlist_item.id,
                user_id=wishlist_item.user_id,
                external_id=wishlist_item.external_id,
                entity_type=wishlist_item.entity_type,
                title=wishlist_item.title,
                image_url=wishlist_item.image_url,
                source=wishlist_item.source,
                created_at=wishlist_item.created_at
            )

        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to add to wishlist: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to add to wishlist",
                details={"error": str(e)}
            )

    def remove_from_wishlist(self, user_id: int, wishlist_id: int) -> bool:
        """Remove an item from user's wishlist"""
        try:
            logger.info(
                f"Removing wishlist item {wishlist_id} for user {user_id}")
            result = self.wishlist_repo.remove_from_wishlist(
                user_id, wishlist_id)
            if not result:
                raise ResourceNotFoundError(
                    error_code=4040,
                    message=f"Wishlist item {wishlist_id} not found or not owned by user {user_id}"
                )
            logger.info(
                f"Successfully removed wishlist item {wishlist_id} for user {user_id}")
            return True
        except ResourceNotFoundError:
            raise
        except Exception as e:
            logger.error(f"Failed to remove from wishlist: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to remove from wishlist",
                details={"error": str(e)}
            )

    def add_to_collection(self, user_id: int, collection_id: int, request: AddToCollectionRequest) -> CollectionItemResponse:
        """Add an album or artist to a collection"""
        try:
            # Get the appropriate external ID based on entity type
            external_id = request.get_external_id()
            if not external_id:
                raise ValidationError(
                    error_code=4000,
                    message="External ID must be provided"
                )

            logger.info(
                f"Adding {request.entity_type} with ID {external_id} to collection {collection_id} for user {user_id}")

            # Get collection
            collection = self.collection_repo.get_by_id(collection_id)
            if not collection:
                raise ResourceNotFoundError("Collection", collection_id)

            # Check if user has permission to modify this collection
            if collection.owner_id != user_id:
                raise ForbiddenError(
                    "You do not have permission to modify this collection")

            # Check if entity exists in our database
            entity = None
            if request.entity_type == EntityTypeEnum.ALBUM:
                entity = self.album_repo.find_by_external_id(external_id)
                if not entity:
                    # Create the album if it doesn't exist
                    album_data = {
                        "external_album_id": external_id,
                        "title": request.title,
                        "image_url": request.image_url,
                        "source": request.source
                    }
                    entity = self.album_repo.create(Album(**album_data))
                    logger.info(f"Created new album with ID {entity.id}")
            else:  # ARTIST
                entity = self.artist_repo.find_by_external_id(external_id)
                if not entity:
                    # Create the artist if it doesn't exist
                    artist_data = {
                        "external_artist_id": external_id,
                        "title": request.title,
                        "image_url": request.image_url,
                        "source": request.source
                    }
                    entity = self.artist_repo.create(Artist(**artist_data))
                    logger.info(f"Created new artist with ID {entity.id}")

            # Add entity to collection
            if request.entity_type == EntityTypeEnum.ALBUM:
                self.db.execute(
                    collection_album.insert().values(
                        collection_id=collection_id,
                        album_id=entity.id,
                        owner_id=user_id
                    )
                )
                logger.info(
                    f"Added album {entity.id} to collection {collection_id}")
            else:  # ARTIST
                self.db.execute(
                    collection_artist.insert().values(
                        collection_id=collection_id,
                        artist_id=entity.id,
                        owner_id=user_id
                    )
                )
                logger.info(
                    f"Added artist {entity.id} to collection {collection_id}")

            # Commit changes to database
            self.db.commit()

            return CollectionItemResponse(
                id=entity.id,
                user_id=user_id,
                external_id=external_id,
                entity_type=request.entity_type,
                title=request.title,
                image_url=request.image_url,
                source=request.source,
                created_at=entity.registered_at
            )

        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to add to collection: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to add to collection",
                details={"error": str(e)}
            )

    def remove_from_collection(self, user_id: int, collection_id: int) -> bool:
        """Remove an item from user's collection"""
        try:
            return self.wishlist_repo.remove_from_collection(user_id, collection_id)
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to remove from collection",
                details={"error": str(e)}
            )

    def get_user_wishlist(self, user_id: int) -> List[WishlistItemResponse]:
        """Get user's wishlist items"""
        try:
            items = self.wishlist_repo.get_user_wishlist(user_id)
            return [
                WishlistItemResponse(
                    id=item.id,
                    user_id=item.user_id,
                    external_id=item.external_id,
                    entity_type=item.entity_type,
                    title=item.title,
                    image_url=item.image_url,
                    source=item.source,
                    created_at=item.created_at
                )
                for item in items
            ]
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to get user wishlist",
                details={"error": str(e)}
            )

    def get_collection_items(self, user_id: int) -> List[CollectionItemResponse]:
        """Get user's collection items"""
        try:
            items = self.wishlist_repo.get_collection_items(user_id)
            return [
                CollectionItemResponse(
                    id=item.id,
                    user_id=item.user_id,
                    discogs_id=item.external_id,
                    entity_type=item.entity_type,
                    created_at=item.created_at
                )
                for item in items
            ]
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to get collection items",
                details={"error": str(e)}
            )
