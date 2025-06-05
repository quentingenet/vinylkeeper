from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.album_model import Album
from app.core.exceptions import ResourceNotFoundError, ServerError


class AlbumRepository:
    """Repository for managing albums"""

    def __init__(self, db: Session):
        self.db = db

    def create(self, album: Album) -> Album:
        """Create a new album"""
        try:
            self.db.add(album)
            self.db.commit()
            self.db.refresh(album)
            return album
        except Exception as e:
            self.db.rollback()
            raise ServerError(
                error_code=5000,
                message="Failed to create album",
                details={"error": str(e)}
            )

    def find_by_id(self, album_id: int) -> Optional[Album]:
        """Find an album by its ID"""
        try:
            return self.db.query(Album).filter(Album.id == album_id).first()
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to find album by ID",
                details={"error": str(e)}
            )

    def find_by_external_id(self, external_id: str) -> Optional[Album]:
        """Find an album by its external ID"""
        try:
            return self.db.query(Album).filter(Album.external_album_id == external_id).first()
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to find album by external ID",
                details={"error": str(e)}
            )

    def update(self, album: Album) -> Album:
        """Update an album"""
        try:
            self.db.commit()
            self.db.refresh(album)
            return album
        except Exception as e:
            self.db.rollback()
            raise ServerError(
                error_code=5000,
                message="Failed to update album",
                details={"error": str(e)}
            )

    def delete(self, album: Album) -> bool:
        """Delete an album"""
        try:
            self.db.delete(album)
            self.db.commit()
            return True
        except Exception as e:
            self.db.rollback()
            raise ServerError(
                error_code=5000,
                message="Failed to delete album",
                details={"error": str(e)}
            )

    def find_all(self) -> List[Album]:
        """Find all albums"""
        try:
            return self.db.query(Album).all()
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to find all albums",
                details={"error": str(e)}
            )
