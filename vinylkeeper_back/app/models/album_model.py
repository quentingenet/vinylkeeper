from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Table,
    event,
    func,
    CheckConstraint
)
from sqlalchemy.orm import relationship, validates
from sqlalchemy.exc import IntegrityError

from app.db.base import Base


class Album(Base):
    """Model representing a music album."""

    __tablename__ = "albums"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(
        String(255),
        nullable=False,
        index=True
    )
    release_id = Column(
        String(36),
        unique=True,
        nullable=False,
        index=True
    )  # MusicBrainz Release ID
    release_year = Column(
        Integer,
        nullable=True,
        index=True
    )

    artist_id = Column(
        Integer,
        ForeignKey("artists.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    artist = relationship(
        "Artist",
        back_populates="albums",
        lazy="selectin"
    )

    # Relations many-to-many optimisées
    collections = relationship(
        "Collection",
        secondary="collection_album",
        back_populates="albums",
        lazy="selectin"
    )
    loans = relationship(
        "Loan",
        back_populates="album",
        lazy="selectin",
        cascade="all, delete-orphan"
    )
    wishlist_items = relationship(
        "Wishlist",
        back_populates="album",
        lazy="selectin",
        cascade="all, delete-orphan"
    )

    # Contraintes de validation
    __table_args__ = (
        CheckConstraint(
            "length(title) >= 1",
            name="check_album_title_length"
        ),
        CheckConstraint(
            "release_year IS NULL OR (release_year >= 1900 AND release_year <= 2100)",
            name="check_release_year_range"
        ),
    )

    @validates('title')
    def validate_title(self, key, title):
        """Validate album title."""
        if not title or len(title.strip()) == 0:
            raise ValueError("Album title cannot be empty")
        return title.strip()

    @validates('release_year')
    def validate_release_year(self, key, year):
        """Validate release year."""
        if year is not None:
            if not isinstance(year, int):
                raise ValueError("Release year must be an integer")
            if year < 1900 or year > 2100:
                raise ValueError("Release year must be between 1900 and 2100")
        return year

    def __repr__(self):
        """String representation of the album."""
        return f"<Album(title={self.title}, artist_id={self.artist_id})>"


# Event listeners
@event.listens_for(Album, 'before_insert')
def validate_release_id(mapper, connection, target):
    """Validate MusicBrainz Release ID format before insertion."""
    if not target.release_id or len(target.release_id) != 36:
        raise ValueError("Invalid MusicBrainz Release ID format")
