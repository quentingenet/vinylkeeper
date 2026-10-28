from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Boolean,
    func,
    CheckConstraint,
    Index,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship, validates

from app.core.orm_utils import is_loaded
from app.models.base import Base


class Collection(Base):
    __tablename__ = "collections"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(String(255), nullable=True)
    is_public = Column(Boolean, default=False, nullable=False)

    mood_id = Column(Integer, ForeignKey("moods.id"), nullable=True, index=True)
    mood = relationship("Mood", back_populates="collections", lazy="raise")

    owner_id = Column(Integer, ForeignKey(
        "users.id", ondelete="CASCADE"), nullable=False)
    owner = relationship("User", back_populates="collections", lazy="raise")

    collection_albums = relationship(
        "CollectionAlbum",
        back_populates="collection",
        cascade="all, delete-orphan",
        lazy="raise"
    )

    collection_artists = relationship(
        "CollectionArtist",
        back_populates="collection",
        cascade="all, delete-orphan",
        lazy="raise"
    )

    artists = relationship(
        "Artist",
        secondary="collection_artist",
        back_populates="collections",
        lazy="noload",
        overlaps="artist,collection,collection_artists"
    )

    likes = relationship(
        "Like",
        back_populates="collection",
        lazy="noload",
        cascade="all, delete-orphan",
        passive_deletes=True
    )

    created_at = Column(DateTime(timezone=True),
                        server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True),
                        server_default=func.now(),
                        onupdate=func.now(), nullable=False)

    # Non-mapped aggregated counts, populated by repository queries
    albums_count = 0
    artists_count = 0

    __table_args__ = (
        CheckConstraint(
            "length(name) >= 1",
            name="check_collection_name_length"
        ),
        UniqueConstraint(
            "owner_id",
            "name",
            name="uq_user_collection_name"
        ),
        Index("ix_collections_is_public_created_at", "is_public", created_at.desc()),
        Index("ix_collections_is_public_updated_at", "is_public", updated_at.desc()),
    )

    @validates('name')
    def validate_name(self, key, name):
        if not name or len(name.strip()) == 0:
            raise ValueError("Collection name cannot be empty")
        return name.strip()

    @validates('description')
    def validate_description(self, key, description):
        if description is not None and len(description) > 255:
            raise ValueError(
                "Description cannot be longer than 255 characters")
        return description

    def __repr__(self):
        mood_name = self.mood.name if is_loaded(self, 'mood') and self.mood else 'None'
        return f"<Collection(name={self.name}, owner_id={self.owner_id}, mood={mood_name})>"
