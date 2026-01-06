from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    UniqueConstraint
)
from sqlalchemy.orm import relationship
from app.models.base import Base
from app.models.album_model import Album
from app.models.collection_model import Collection
from app.models.user_model import User
from app.models.reference_data.vinyl_state import VinylState


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

    collection = relationship(
        "Collection", back_populates="collection_albums", lazy="selectin")
    album = relationship(
        "Album", back_populates="album_collections", lazy="selectin")
    state_record_ref = relationship("VinylState", foreign_keys=[
                                    state_record], lazy="selectin")
    state_cover_ref = relationship("VinylState", foreign_keys=[
                                   state_cover], lazy="selectin")
