from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base


class Wishlist(Base):
    __tablename__ = "wishlists"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    album_id = Column(Integer, ForeignKey("albums.id"))

    user = relationship("User", back_populates="wishlist_items")
    album = relationship("Album", back_populates="wishlist_entries")
