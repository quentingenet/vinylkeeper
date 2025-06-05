from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    func,
)
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.models.association_tables import ( 
    collection_album,
    collection_artist,
)


class Collection(Base):
    """Model representing a vinyl collection."""

    __tablename__ = "collections"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True, nullable=False)
    description = Column(String(255), nullable=True)
    is_public = Column(Boolean, default=False, nullable=False)

    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    owner = relationship("User", back_populates="collections")

    albums = relationship("Album", secondary=collection_album, back_populates="collections")
    artists = relationship("Artist", secondary=collection_artist, back_populates="collections")

    liked_by = relationship(
        "User",
        secondary="collection_likes",
        back_populates="liked_collections"
    )

    registered_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
