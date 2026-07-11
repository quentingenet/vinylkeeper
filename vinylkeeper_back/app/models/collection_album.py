from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import Base


class CollectionAlbum(Base):
    __tablename__ = "collection_album"

    collection_id = Column(Integer, ForeignKey(
        "collections.id", ondelete="CASCADE"), primary_key=True)
    album_id = Column(Integer, ForeignKey(
        "albums.id", ondelete="CASCADE"), primary_key=True)

    state_record = Column(Integer, ForeignKey(
        "vinyl_states.id"), nullable=True)
    state_cover = Column(Integer, ForeignKey("vinyl_states.id"), nullable=True)
    acquisition_month_year = Column(
        String(7), nullable=True, comment="Format: YYYY-MM")

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
    state_record_ref = relationship("VinylState", foreign_keys=[
                                    state_record], lazy="raise")
    state_cover_ref = relationship("VinylState", foreign_keys=[
                                   state_cover], lazy="raise")
