from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    DateTime,
    ForeignKey,
    func,
)
from sqlalchemy.orm import relationship

from app.db.base import Base


class Wishlist(Base):
    """Model representing a user's wishlist item (album or artist)."""

    __tablename__ = "wishlists"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    album_id = Column(Integer, ForeignKey("albums.id", ondelete="CASCADE"), nullable=True, index=True)
    artist_id = Column(Integer, ForeignKey("artists.id", ondelete="CASCADE"), nullable=True, index=True)
    added_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="wishlist_items")
    album = relationship("Album", back_populates="wishlist_items")
    artist = relationship("Artist", back_populates="wishlist_items")
