from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base

class Album(Base):
    __tablename__ = "albums"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    release_id = Column(String(36), unique=True, nullable=False)  # MusicBrainz Release ID
    release_year = Column(Integer, nullable=True)

    artist_id = Column(Integer, ForeignKey("artists.id", ondelete="CASCADE"), nullable=False)
    artist = relationship("Artist", back_populates="albums")

    collections = relationship("Collection", secondary="collection_album", back_populates="albums")
    loans = relationship("Loan", back_populates="album")
    wishlist_items = relationship("Wishlist", back_populates="album")
