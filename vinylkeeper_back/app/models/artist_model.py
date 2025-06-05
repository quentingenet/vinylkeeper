from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Table,
    event,
    func,
    CheckConstraint
)
from sqlalchemy.orm import relationship, validates
from sqlalchemy.exc import IntegrityError
from app.models.base import Base
from typing import Optional
from pydantic import BaseModel, Field
from app.models.association_tables import album_artist


class ArtistBase(BaseModel):
    """Base schema for artist data."""
    name: str = Field(
        min_length=1,
        max_length=255,
        description="Artist name must be between 1 and 255 characters"
    )
    musicbrainz_id: str = Field(
        min_length=36,
        max_length=36,
        description="MusicBrainz Artist ID (36 characters)"
    )
    country: Optional[str] = Field(
        None,
        max_length=100,
        description="Country of the artist (optional, max 100 chars)"
    )


class Artist(Base):
    """Artist model."""
    __tablename__ = "artists"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    musicbrainz_id = Column(String(36), unique=True,
                            nullable=False, index=True)
    country = Column(String(100), nullable=True)
    registered_at = Column(DateTime(timezone=True),
                           server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(
    ), onupdate=func.now(), nullable=False)
    # Relations optimisées
    albums = relationship(
        "Album",
        secondary=album_artist,
        back_populates="artists",
        lazy="selectin"
    )
    collections = relationship(
        "Collection",
        secondary="collection_artist",
        back_populates="artists",
        lazy="selectin"
    )
    wishlist_items = relationship(
        "Wishlist",
        back_populates="artist",
        lazy="selectin",
        cascade="all, delete-orphan"
    )
    __table_args__ = (
        CheckConstraint("length(name) >= 1", name="check_artist_name_length"),
    )

    @validates('name')
    def validate_name(self, key, name):
        if not name or len(name.strip()) == 0:
            raise ValueError("Artist name cannot be empty")
        return name.strip()

    def __repr__(self):
        return f"<Artist(name={self.name}, musicbrainz_id={self.musicbrainz_id})>"

# Event listeners


@event.listens_for(Artist, 'before_insert')
def validate_musicbrainz_id(mapper, connection, target):
    if not target.musicbrainz_id or len(target.musicbrainz_id) != 36:
        raise ValueError("Invalid MusicBrainz ID format")


@event.listens_for(Artist, 'before_insert')
def set_timestamps(mapper, connection, target):
    now = func.now()
    target.registered_at = now
    target.updated_at = now


@event.listens_for(Artist, 'before_update')
def update_timestamp(mapper, connection, target):
    target.updated_at = func.now()
