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


class Artist(Base):
    """Model representing a music artist."""

    __tablename__ = "artists"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(
        String(255),
        nullable=False,
        index=True
    )
    musicbrainz_id = Column(
        String(36),
        unique=True,
        nullable=False,
        index=True
    )  # MBID

    # Optimized relationships
    albums = relationship(
        "Album",
        back_populates="artist",
        lazy="selectin",
        cascade="all, delete-orphan"
    )
    collections = relationship(
        "Collection",
        secondary="collection_artist",
        back_populates="artists",
        lazy="selectin"
    )
    wishlist_items = relationship(
        "Wishlist",
        back_populates="artist",
        lazy="selectin",
        cascade="all, delete-orphan"
    )

    # Validation constraints
    __table_args__ = (
        CheckConstraint(
            "length(name) >= 1",
            name="check_artist_name_length"
        ),
    )

    @validates('name')
    def validate_name(self, key, name):
        """Validate artist name."""
        if not name or len(name.strip()) == 0:
            raise ValueError("Artist name cannot be empty")
        return name.strip()

    def __repr__(self):
        """String representation of the artist."""
        return f"<Artist(name={self.name}, musicbrainz_id={self.musicbrainz_id})>"


# Event listeners
@event.listens_for(Artist, 'before_insert')
def validate_musicbrainz_id(mapper, connection, target):
    """Validate MusicBrainz ID format before insertion."""
    if not target.musicbrainz_id or len(target.musicbrainz_id) != 36:
        raise ValueError("Invalid MusicBrainz ID format")
