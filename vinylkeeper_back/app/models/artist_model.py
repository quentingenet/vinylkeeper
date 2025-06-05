from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.db.base import Base

class Artist(Base):
    __tablename__ = "artists"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    musicbrainz_id = Column(String(36), unique=True, nullable=False)  # MBID

    albums = relationship("Album", back_populates="artist")
    collections = relationship("Collection", secondary="collection_artist", back_populates="artists")
    wishlist_items = relationship("Wishlist", back_populates="artist")
