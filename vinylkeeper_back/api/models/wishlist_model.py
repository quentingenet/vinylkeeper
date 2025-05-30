from sqlalchemy import Column, DateTime, Integer, ForeignKey, func
from sqlalchemy.orm import relationship
from api.db.base import Base


class Wishlist(Base):
    __tablename__ = "wishlists"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # Support for local albums
    album_id = Column(Integer, ForeignKey("albums.id"), nullable=True)
    
    # Support for external references (Deezer, etc.)
    external_reference_id = Column(Integer, ForeignKey("external_references.id"), nullable=True)

    user = relationship("User", back_populates="wishlist_items")
    album = relationship("Album", back_populates="wishlist_entries")
    external_reference = relationship("ExternalReference", back_populates="wishlist_entries")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())