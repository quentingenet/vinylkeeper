from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.collection_album import CollectionAlbum
from app.core.exceptions import (
    ResourceNotFoundError,
    ServerError,
    DuplicateFieldError
)
from app.core.logging import logger


class CollectionAlbumRepository:
    """Repository for managing collection-album associations"""

    def __init__(self, db: Session):
        self.db = db

    def create(self, collection_album: CollectionAlbum) -> CollectionAlbum:
        """Create a new collection-album association"""
        try:
            self.db.add(collection_album)
            self.db.commit()
            self.db.refresh(collection_album)
            return collection_album
        except Exception as e:
            self.db.rollback()
            logger.error(
                f"Error creating collection-album association: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to create collection-album association",
                details={"error": str(e)}
            )

    def delete(self, collection_album: CollectionAlbum) -> bool:
        """Delete a collection-album association"""
        try:
            self.db.delete(collection_album)
            self.db.commit()
            return True
        except Exception as e:
            self.db.rollback()
            logger.error(
                f"Error deleting collection-album association: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to delete collection-album association",
                details={"error": str(e)}
            )

    def find_by_collection_and_album(self, collection_id: int, album_id: int) -> Optional[CollectionAlbum]:
        """Find a collection-album association by collection and album IDs"""
        try:
            return self.db.query(CollectionAlbum).filter(
                CollectionAlbum.collection_id == collection_id,
                CollectionAlbum.album_id == album_id
            ).first()
        except Exception as e:
            logger.error(
                f"Error finding collection-album association: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to find collection-album association",
                details={"error": str(e)}
            )

    def find_by_collection(self, collection_id: int) -> List[CollectionAlbum]:
        """Find all album associations for a collection"""
        try:
            return self.db.query(CollectionAlbum).filter(
                CollectionAlbum.collection_id == collection_id
            ).all()
        except Exception as e:
            logger.error(f"Error finding collection albums: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to find collection albums",
                details={"error": str(e)}
            )

    def find_by_album(self, album_id: int) -> List[CollectionAlbum]:
        """Find all collection associations for an album"""
        try:
            return self.db.query(CollectionAlbum).filter(
                CollectionAlbum.album_id == album_id
            ).all()
        except Exception as e:
            logger.error(f"Error finding album collections: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to find album collections",
                details={"error": str(e)}
            )

