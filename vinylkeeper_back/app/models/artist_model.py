from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    func
)
from sqlalchemy.orm import relationship, validates, foreign
from app.models.base import Base
from app.models.association_tables import album_artist, collection_artist
from app.core.enums import ExternalSourceEnum


class Artist(Base):
    """Artist model representing a musical artist in the user's collection.

    This model stores information about artists that can be associated with albums
    and collections. Each artist is uniquely identified by their external ID.
    """

    __tablename__ = "artists"

    id = Column(Integer, primary_key=True, index=True)

    external_artist_id = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
        comment="External Artist ID as string"
    )

    title = Column(
        String(512),
        nullable=True,
        comment="Name of the artist"
    )

    image_url = Column(
        String(1024),
        nullable=True,
        comment="URL of the artist image"
    )

    source = Column(
        SQLEnum(ExternalSourceEnum, name="externalsourceenum"),
        nullable=False,
        server_default=ExternalSourceEnum.DISCOGS.value,
        comment="Source of the artist data"
    )

    registered_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="When the artist was first registered"
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="When the artist was last updated"
    )

    # Relationships
    collections = relationship(
        "Collection",
        secondary=collection_artist,
        back_populates="artists",
        lazy="selectin"
    )

    albums = relationship(
        "Album",
        secondary=album_artist,
        back_populates="artists",
        lazy="selectin"
    )

    wishlist_items = relationship(
        "Wishlist",
        back_populates="artist",
        lazy="selectin",
        primaryjoin="and_(Artist.external_artist_id == foreign(Wishlist.external_id), Wishlist.entity_type == 'ARTIST')",
        overlaps="albums,wishlist_items",
        viewonly=True
    )

    @validates('external_artist_id')
    def validate_external_artist_id(self, key, value):
        """Validate external artist ID format."""
        if not value or not value.isdigit():
            raise ValueError(
                "External artist ID must be a non-empty numeric string")
        return value

    def __repr__(self):
        """String representation of the artist."""
        return f"<Artist(external_artist_id={self.external_artist_id})>"
