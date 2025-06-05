import enum
from sqlalchemy import Column, Integer, String, DateTime, Enum, func
from sqlalchemy.orm import relationship
from api.db.base import Base


class ExternalSourceEnum(enum.Enum):
    DEEZER = "deezer"
    SPOTIFY = "spotify"
    MUSICBRAINZ = "musicbrainz"


class ExternalItemTypeEnum(enum.Enum):
    ALBUM = "album"
    ARTIST = "artist"


class ExternalReference(Base):
    __tablename__ = "external_references"

    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(String(255), nullable=False, index=True)  # ID from external API
    external_source = Column(Enum(ExternalSourceEnum), nullable=False)
    item_type = Column(Enum(ExternalItemTypeEnum), nullable=False)
    
    # Minimal metadata for display only (legal)
    title = Column(String(255), nullable=True)  # Album title or Artist name
    artist_name = Column(String(255), nullable=True)  # For albums only
    
    # Image URLs from external API
    picture_small = Column(String(500), nullable=True)
    picture_medium = Column(String(500), nullable=True)
    picture_big = Column(String(500), nullable=True)
    
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    
    # Relationships
    wishlist_entries = relationship("Wishlist", back_populates="external_reference")
    collection_entries = relationship("CollectionExternalReference", back_populates="external_reference") 