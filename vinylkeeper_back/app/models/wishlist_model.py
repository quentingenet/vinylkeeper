from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    UniqueConstraint
)
from sqlalchemy.orm import relationship, validates, foreign
from datetime import datetime
from app.models.base import Base
from app.core.enums import EntityTypeEnum, ExternalSourceEnum


class Wishlist(Base):
    """Wishlist model for storing user's wishlist items."""
    __tablename__ = "wishlist"

    __table_args__ = (
        UniqueConstraint("user_id", "external_id", "entity_type",
                         "source", name="uq_user_external_entity_source"),
    )

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id"),
                     nullable=False, index=True)
    external_id = Column(String(255), nullable=False, index=True)
    source = Column(SQLEnum(ExternalSourceEnum, name="externalsourceenum"),
                    nullable=False, server_default=ExternalSourceEnum.DISCOGS.value)
    entity_type = Column(
        SQLEnum(EntityTypeEnum, name="entitytypeenum"), nullable=False, index=True)

    title = Column(String(512), nullable=True)
    image_url = Column(String(1024), nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    user = relationship(
        "User",
        back_populates="wishlist_items",
        lazy="selectin"
    )

    artist = relationship(
        "Artist",
        back_populates="wishlist_items",
        lazy="selectin",
        primaryjoin="and_(foreign(Wishlist.external_id) == Artist.external_artist_id, Wishlist.entity_type == 'ARTIST')",
        overlaps="album,wishlist_items",
        viewonly=True
    )

    album = relationship(
        "Album",
        back_populates="wishlist_items",
        lazy="selectin",
        primaryjoin="and_(foreign(Wishlist.external_id) == Album.external_album_id, Wishlist.entity_type == 'ALBUM')",
        overlaps="artist,wishlist_items",
        viewonly=True
    )

    @validates('external_id')
    def validate_external_id(self, key, value):
        """Validate external ID format."""
        if not value or not value.isdigit():
            raise ValueError("External ID must be a non-empty numeric string")
        return value

    def __repr__(self):
        """String representation of the wishlist item."""
        return f"<Wishlist(user_id={self.user_id}, external_id={self.external_id}, entity_type={self.entity_type})>"
