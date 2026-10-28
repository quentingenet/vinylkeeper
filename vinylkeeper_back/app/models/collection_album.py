from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, ForeignKeyConstraint, Index, Integer, String, false, func,
)
from sqlalchemy.orm import relationship
from app.models.base import Base


class CollectionAlbum(Base):
    __tablename__ = "collection_album"

    collection_id = Column(Integer, ForeignKey(
        "collections.id", ondelete="CASCADE"), primary_key=True)
    album_id = Column(Integer, ForeignKey(
        "albums.id", ondelete="CASCADE"), primary_key=True)

    # state_record, state_cover and acquisition_month_year still exist in the table but are
    # frozen since the copies migration: the condition lives on each copy now.

    # Until pressings were shown in search results, people picked the first release offered:
    # the release of those albums may not be their actual pressing
    pressing_confirmed = Column(Boolean, nullable=False, server_default=false(),
                                comment="The owner chose or confirmed this exact release")

    created_at = Column(DateTime(timezone=True),
                        nullable=True)
    updated_at = Column(DateTime(timezone=True),
                        nullable=True)

    # raise: dead relation (0 read sites) and the main link in the
    # Collection -> collection_albums -> Album -> album_collections -> Collection
    # reload loop. Never deleted via ORM cascade (Album/Album repo .delete() unused).
    collection = relationship(
        "Collection", back_populates="collection_albums", lazy="raise")
    album = relationship(
        "Album", back_populates="album_collections", lazy="raise")
    # Oldest first: the first copy is the one clients unaware of copies read and write.
    # passive_deletes: the database cascade removes copies, no load needed on delete.
    copies = relationship(
        "CollectionAlbumCopy", back_populates="collection_album", order_by="CollectionAlbumCopy.id",
        cascade="all, delete-orphan", passive_deletes=True, lazy="raise")

    def first_copy(self) -> "CollectionAlbumCopy":
        """Oldest copy (copies must be loaded); created if missing so that a write is never lost."""
        if not self.copies:
            now = datetime.now(timezone.utc)
            self.copies.append(CollectionAlbumCopy(created_at=now, updated_at=now))
        return self.copies[0]


class CollectionAlbumCopy(Base):
    """One physical copy of an album in a collection, with its own condition."""
    __tablename__ = "collection_album_copies"
    __table_args__ = (
        ForeignKeyConstraint(
            ["collection_id", "album_id"],
            ["collection_album.collection_id", "collection_album.album_id"],
            ondelete="CASCADE",
        ),
        Index("ix_collection_album_copies_collection_album", "collection_id", "album_id"),
    )

    id = Column(Integer, primary_key=True)
    collection_id = Column(Integer, nullable=False)
    album_id = Column(Integer, nullable=False)

    state_record = Column(Integer, ForeignKey("vinyl_states.id"), nullable=True)
    state_cover = Column(Integer, ForeignKey("vinyl_states.id"), nullable=True)
    acquisition_month_year = Column(String(7), nullable=True, comment="Format: YYYY-MM")

    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    collection_album = relationship("CollectionAlbum", back_populates="copies", lazy="raise")
