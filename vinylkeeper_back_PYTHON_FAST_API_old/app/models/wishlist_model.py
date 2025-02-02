from sqlalchemy import Column, DateTime, Integer, ForeignKey, func
from sqlalchemy.orm import relationship
from app.db.base import Base


class Wishlist(Base):
    __tablename__ = "wishlists"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    album_id = Column(Integer, ForeignKey("albums.id"))

    user = relationship("User", back_populates="wishlist_items")
    album = relationship("Album", back_populates="wishlist_entries")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())