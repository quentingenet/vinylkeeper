from sqlalchemy import (
    Column,
    Integer,
    Enum as SQLEnum,
    String,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    event,
    func,
)
from sqlalchemy.orm import relationship, validates

from app.models.base import Base
from app.core.enums import ExternalSourceEnum, StateEnum, MoodEnum
from app.models.association_tables import album_artist


class Album(Base):
    """Album model representing a vinyl record in the user's collection."""

    __table_args__ = (
        UniqueConstraint(
            "external_album_id",
            "source",
            name="uq_external_album_id_source",
        ),
    )

    __tablename__ = "albums"

    id = Column(Integer, primary_key=True, index=True)

    external_album_id = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
        comment="External Album ID as string",
    )

    source = Column(
        SQLEnum(ExternalSourceEnum, name="externalsourceenum"),
        nullable=False,
        server_default=ExternalSourceEnum.DISCOGS.value,
        comment="Source of the external album ID"
    )

    title = Column(
        String(512),
        nullable=True,
        comment="Cached title of the album"
    )

    image_url = Column(
        String(1024),
        nullable=True,
        comment="Cached cover image URL for the album"
    )

    registered_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="When the album was first registered",
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="When the album was last updated",
    )

    # Relationships
    collections = relationship(
        "Collection",
        secondary="collection_album",
        back_populates="albums",
        lazy="selectin",
    )
    artists = relationship(
        "Artist",
        secondary=album_artist,
        back_populates="albums",
        lazy="selectin",
    )
    loans = relationship(
        "Loan",
        back_populates="album",
        lazy="selectin",
        cascade="all, delete-orphan",
    )

    wishlist_items = relationship(
        "Wishlist",
        back_populates="album",
        lazy="selectin",
        primaryjoin="and_(Album.external_album_id == foreign(Wishlist.external_id), Wishlist.entity_type == 'ALBUM')",
        overlaps="artists,wishlist_items",
        viewonly=True
    )

    @validates('external_album_id')
    def validate_external_album_id(self, key, value):
        """Validate external album ID format."""
        if not value:
            raise ValueError("External album ID must not be empty")
        return value

    def __repr__(self):
        """String representation of the album."""
        return f"<Album(external_album_id={self.external_album_id!r}, source={self.source})>"


# Event listeners for timestamps
@event.listens_for(Album, "before_insert")
def set_timestamps(mapper, connection, target):
    """Set timestamps before insertion."""
    now = func.now()
    target.registered_at = now
    target.updated_at = now


@event.listens_for(Album, "before_update")
def update_timestamp(mapper, connection, target):
    """Update timestamp before update."""
    target.updated_at = func.now()
