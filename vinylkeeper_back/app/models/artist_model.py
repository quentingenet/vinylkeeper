from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Index,
    UniqueConstraint,
    func
)
from sqlalchemy.orm import relationship, validates
from app.core.orm_utils import is_loaded
from app.models.base import Base


class Artist(Base):
    __tablename__ = "artists"

    __table_args__ = (
        UniqueConstraint(
            "external_artist_id",
            "external_source_id",
            name="uq_external_artist_id_source"
        ),
        # Needs the pg_trgm extension (migration e1a2b3c4d5e6)
        Index("ix_artists_title_trgm", "title", postgresql_using="gin",
              postgresql_ops={"title": "gin_trgm_ops"}),
    )

    id = Column(Integer, primary_key=True)

    external_artist_id = Column(
        String(255),
        nullable=False,
        comment="External Artist ID as string"
    )

    title = Column(String(512), nullable=True, comment="Name of the artist")
    image_url = Column(String(1024), nullable=True, comment="Artist image URL")

    external_source_id = Column(
        Integer,
        ForeignKey("external_sources.id"),
        nullable=False,
        comment="Reference to external source (e.g. MusicBrainz)"
    )
    external_source = relationship(
        "ExternalSource", back_populates="artists", lazy="raise")

    created_at = Column(DateTime(timezone=True),
                        server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True),
                        server_default=func.now(),
                        onupdate=func.now(), nullable=False)

    # Non-mapped aggregated count, populated by repository queries
    collections_count = 0

    # raise: dead relation (0 read sites). ArtistRepository.delete() is
    # unused, so the delete-orphan cascade never needs this loaded.
    collection_artists = relationship(
        "CollectionArtist",
        back_populates="artist",
        cascade="all, delete-orphan",
        lazy="raise"
    )

    # raise: dead relation (0 read sites) and the single biggest fan-out
    # source in the app — loading any Artist used to eager-load every
    # Collection (across all users) containing it, each of which then
    # cascaded through its own full selectin chain.
    collections = relationship(
        "Collection",
        secondary="collection_artist",
        back_populates="artists",
        lazy="raise",
        overlaps="collection_artists"
    )

    @validates('external_artist_id')
    def validate_external_artist_id(self, key, value):
        if not value or not value.isdigit():
            raise ValueError(
                "External artist ID must be a non-empty numeric string")
        return value

    def __repr__(self):
        loaded = is_loaded(self, 'external_source') and self.external_source
        source_name = self.external_source.name if loaded else 'None'
        return f"<Artist(external_artist_id={self.external_artist_id}, source={source_name})>"
