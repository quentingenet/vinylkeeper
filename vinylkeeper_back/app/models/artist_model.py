from sqlalchemy import (
    Column,
    ForeignKey,
    Integer,
    String,
    DateTime,
    event,
    func,
)
from sqlalchemy.orm import relationship
from app.models.base import Base
from app.models.association_tables import album_artist


class Artist(Base):
    """Artist model."""
    __tablename__ = "artists"
    id = Column(Integer, primary_key=True, index=True)
    discogs_artist_id = Column(String(255), unique=True,
                               nullable=False, index=True)
    owner_id = Column(Integer, ForeignKey(
        "users.id", ondelete="CASCADE"), nullable=False, index=True)
    registered_at = Column(DateTime(timezone=True),
                           server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(
    ), onupdate=func.now(), nullable=False)

    collections = relationship(
        "Collection",
        secondary="collection_artist",
        back_populates="artists",
        lazy="selectin"
    )

    albums = relationship(
        "Album",
        secondary=album_artist,
        back_populates="artists",
        lazy="selectin"
    )

    def __repr__(self):
        return f"<Artist(discogs_artist_id={self.discogs_artist_id})>"


@event.listens_for(Artist, 'before_insert')
def validate_discogs_artist_id(mapper, connection, target):
    if not target.discogs_artist_id or len(target.discogs_artist_id) < 1 or len(target.discogs_artist_id) > 255:
        raise ValueError("Invalid Discogs Artist ID format")


@event.listens_for(Artist, 'before_insert')
def set_timestamps(mapper, connection, target):
    now = func.now()
    target.registered_at = now
    target.updated_at = now


@event.listens_for(Artist, 'before_update')
def update_timestamp(mapper, connection, target):
    target.updated_at = func.now()
