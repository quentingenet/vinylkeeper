from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    func
)
from sqlalchemy.orm import relationship, validates
from app.models.base import Base
from app.models.association_tables import collection_artist


class Artist(Base):
    __tablename__ = "artists"

    __table_args__ = (
        UniqueConstraint(
            "external_artist_id",
            "external_source_id",
            name="uq_external_artist_id_source"
        ),
    )

    id = Column(Integer, primary_key=True, index=True)

    external_artist_id = Column(
        String(255),
        nullable=False,
        index=True,
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
        "ExternalSource", back_populates="artists", lazy="selectin")

    created_at = Column(DateTime(timezone=True),
                        server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True),
                        server_default=func.now(),
                        onupdate=func.now(), nullable=False)

    collections = relationship(
        "Collection",
        secondary=collection_artist,
        back_populates="artists",
        lazy="selectin"
    )

    @validates('external_artist_id')
    def validate_external_artist_id(self, key, value):
        if not value or not value.isdigit():
            raise ValueError(
                "External artist ID must be a non-empty numeric string")
        return value

    def __repr__(self):
        return f"<Artist(external_artist_id={self.external_artist_id}, source={self.external_source.name})>"
