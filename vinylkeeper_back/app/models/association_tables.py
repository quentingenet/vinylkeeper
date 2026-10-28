from sqlalchemy import (
    Column, Integer, ForeignKey, DateTime, Index, text
)
from sqlalchemy.orm import relationship
from app.models.base import Base


class CollectionArtist(Base):
    """Association model between Collections and Artists"""
    __tablename__ = "collection_artist"

    collection_id = Column(Integer, ForeignKey(
        "collections.id", ondelete="CASCADE"), primary_key=True)
    artist_id = Column(Integer, ForeignKey(
        "artists.id", ondelete="CASCADE"), primary_key=True)

    created_at = Column(DateTime(timezone=True),
                        nullable=True)
    updated_at = Column(DateTime(timezone=True),
                        nullable=True)

    __table_args__ = (
        Index("ix_collection_artist_artist_id", "artist_id"),
        Index("ix_collection_artist_updated_at", "updated_at",
              postgresql_where=text("updated_at IS NOT NULL")),
    )

    collection = relationship(
        "Collection", back_populates="collection_artists", overlaps="collections")
    # selectin: Collection.collection_artists is eager-loaded via selectin, and
    # collection_service._build_collection_response reads .artist on each row.
    # Without this, .artist stays unloaded and raises MissingGreenlet under AsyncSession.
    artist = relationship(
        "Artist", back_populates="collection_artists", overlaps="collections", lazy="selectin")


# Keep a reference to the table for backward compatibility with code using .c notation
collection_artist = CollectionArtist.__table__
