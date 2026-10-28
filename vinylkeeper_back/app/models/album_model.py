from sqlalchemy import (
    CheckConstraint,
    Column,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    Text,
    DateTime,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import relationship, validates
from app.core.orm_utils import is_loaded
from app.models.base import Base


class Album(Base):
    __tablename__ = "albums"

    __table_args__ = (
        UniqueConstraint("external_album_id", "external_source_id",
                         name="uq_external_album_id_source"),
        CheckConstraint(
            "enrichment_status IN ('ok', 'pending_master', 'not_found')",
            name="ck_albums_enrichment_status"
        ),
        Index("ix_albums_genres", "genres", postgresql_using="gin"),
        Index("ix_albums_styles", "styles", postgresql_using="gin"),
        Index("ix_albums_external_master_id", "external_master_id"),
        # Needs the pg_trgm extension (migration e1a2b3c4d5e6)
        Index("ix_albums_title_trgm", "title", postgresql_using="gin",
              postgresql_ops={"title": "gin_trgm_ops"}),
    )

    id = Column(Integer, primary_key=True)

    external_album_id = Column(
        String(255),
        nullable=False,
        comment="External Album ID as string"
    )

    title = Column(String(512), nullable=True,
                   comment="Cached title of the album")

    external_source_id = Column(Integer, ForeignKey(
        "external_sources.id"), nullable=False)
    external_source = relationship(
        "ExternalSource", back_populates="albums", lazy="raise")

    image_url = Column(String(1024), nullable=True,
                       comment="Cached album cover")

    # Discogs metadata, filled once by the enrichment service (never by clients)
    external_master_id = Column(String(255), nullable=True,
                                comment="External master ID (groups pressings of the same work)")
    release_year = Column(SmallInteger, nullable=True, comment="Year of this pressing")
    original_year = Column(SmallInteger, nullable=True, comment="Original release year of the work (master)")
    artist_name = Column(String(512), nullable=True, comment="Artist names of the release")
    genres: Column = Column(ARRAY(Text), nullable=True)
    styles: Column = Column(ARRAY(Text), nullable=True)
    # Pressing details of this release
    country = Column(String(100), nullable=True, comment="Country of this pressing")
    label = Column(String(512), nullable=True, comment="First label of this pressing")
    catno = Column(String(255), nullable=True, comment="Catalogue number")
    formats: Column = Column(ARRAY(Text), nullable=True,
                             comment="Format descriptions (LP, Reissue, Mono...); NULL = not fetched yet")
    enriched_at = Column(DateTime(timezone=True), nullable=True,
                         comment="When the release metadata was fetched; NULL = not enriched yet")
    enrichment_status = Column(String(20), nullable=True,
                               comment="'ok' | 'pending_master' | 'not_found'")

    created_at = Column(DateTime(timezone=True),
                        server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True),
                        server_default=func.now(),
                        onupdate=func.now(), nullable=False)

    # Non-mapped aggregated counts, populated by repository queries
    collections_count = 0
    loans_count = 0
    wishlist_count = 0

    # raise: dead relation (0 read sites), the other end of the
    # Collection <-> Album reload loop. AlbumRepository.delete() is unused,
    # so the delete-orphan cascade never needs this loaded.
    album_collections = relationship(
        "CollectionAlbum",
        back_populates="album",
        cascade="all, delete-orphan",
        lazy="raise"
    )

    @validates('external_album_id')
    def validate_external_album_id(self, key, value):
        if not value or not value.isdigit():
            raise ValueError(
                "External album ID must be a non-empty numeric string")
        return value

    def __repr__(self):
        loaded = is_loaded(self, 'external_source') and self.external_source
        source_name = self.external_source.name if loaded else 'None'
        return f"<Album(external_album_id={self.external_album_id!r}, source={source_name})>"
