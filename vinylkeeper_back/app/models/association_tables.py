from sqlalchemy import (
    Column, Integer, ForeignKey, DateTime
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

    collection = relationship(
        "Collection", back_populates="collection_artists", overlaps="collections")
    artist = relationship(
        "Artist", back_populates="collection_artists", overlaps="collections")


# Keep a reference to the table for backward compatibility with code using .c notation
collection_artist = CollectionArtist.__table__
