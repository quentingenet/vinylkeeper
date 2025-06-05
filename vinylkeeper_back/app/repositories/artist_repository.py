from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.artist_model import Artist
from app.core.exceptions import ResourceNotFoundError, ServerError


class ArtistRepository:
    """Repository for managing artists"""

    def __init__(self, db: Session):
        self.db = db

    def create(self, artist: Artist) -> Artist:
        """Create a new artist"""
        try:
            self.db.add(artist)
            self.db.commit()
            self.db.refresh(artist)
            return artist
        except Exception as e:
            self.db.rollback()
            raise ServerError(
                error_code=5000,
                message="Failed to create artist",
                details={"error": str(e)}
            )

    def find_by_id(self, artist_id: int) -> Optional[Artist]:
        """Find an artist by its ID"""
        try:
            return self.db.query(Artist).filter(Artist.id == artist_id).first()
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to find artist by ID",
                details={"error": str(e)}
            )

    def find_by_external_id(self, external_id: str) -> Optional[Artist]:
        """Find an artist by its external ID"""
        try:
            return self.db.query(Artist).filter(Artist.external_artist_id == external_id).first()
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to find artist by external ID",
                details={"error": str(e)}
            )

    def update(self, artist: Artist) -> Artist:
        """Update an artist"""
        try:
            self.db.commit()
            self.db.refresh(artist)
            return artist
        except Exception as e:
            self.db.rollback()
            raise ServerError(
                error_code=5000,
                message="Failed to update artist",
                details={"error": str(e)}
            )

    def delete(self, artist: Artist) -> bool:
        """Delete an artist"""
        try:
            self.db.delete(artist)
            self.db.commit()
            return True
        except Exception as e:
            self.db.rollback()
            raise ServerError(
                error_code=5000,
                message="Failed to delete artist",
                details={"error": str(e)}
            )

    def find_all(self) -> List[Artist]:
        """Find all artists"""
        try:
            return self.db.query(Artist).all()
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to find all artists",
                details={"error": str(e)}
            )
