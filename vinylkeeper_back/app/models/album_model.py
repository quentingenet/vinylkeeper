from sqlalchemy import (
    Column,
    ForeignKey,
    Integer,
    String,
    DateTime,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship, validates
from app.models.base import Base


class Album(Base):
    __tablename__ = "albums"

    __table_args__ = (
        UniqueConstraint("external_album_id", "external_source_id",
                         name="uq_external_album_id_source"),
    )

    id = Column(Integer, primary_key=True, index=True)

    external_album_id = Column(
        String(255),
        nullable=False,
        index=True,
        comment="External Album ID as string"
    )

    title = Column(String(512), nullable=True,
                   comment="Cached title of the album")

    external_source_id = Column(Integer, ForeignKey(
        "external_sources.id"), nullable=False)
    external_source = relationship(
        "ExternalSource", back_populates="albums", lazy="selectin")

    image_url = Column(String(1024), nullable=True,
                       comment="Cached album cover")

    created_at = Column(DateTime(timezone=True),
                        server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True),
                        server_default=func.now(),
                        onupdate=func.now(), nullable=False)

    album_collections = relationship(
        "CollectionAlbum",
        back_populates="album",
        cascade="all, delete-orphan",
        lazy="selectin"
    )

    loans = relationship(
        "Loan",
        back_populates="album",
        lazy="selectin",
        cascade="all, delete-orphan"
    )

    @validates('external_album_id')
    def validate_external_album_id(self, key, value):
        if not value or not value.isdigit():
            raise ValueError(
                "External album ID must be a non-empty numeric string")
        return value

    def __repr__(self):
        return f"<Album(external_album_id={self.external_album_id!r}, source={self.external_source.name})>"
