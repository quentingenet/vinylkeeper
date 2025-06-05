# app/models/reference/external_source_model.py
from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.models.base import Base


class ExternalSource(Base):
    __tablename__ = "external_sources"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)

    albums = relationship(
        "Album", back_populates="external_source", lazy="selectin")
    artists = relationship(
        "Artist", back_populates="external_source", lazy="selectin")
    wishlist_items = relationship(
        "Wishlist", back_populates="external_source", lazy="selectin")

    def __repr__(self):
        return f"<ExternalSource(name={self.name})>"
