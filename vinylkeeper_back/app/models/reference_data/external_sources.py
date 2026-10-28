from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.models.base import Base


class ExternalSource(Base):
    __tablename__ = "external_sources"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)

    # Never loaded: looking a reference value up must not load all the rows pointing to it
    albums = relationship(
        "Album", back_populates="external_source", lazy="noload")
    artists = relationship(
        "Artist", back_populates="external_source", lazy="noload")
    wishlist_items = relationship(
        "Wishlist", back_populates="external_source", lazy="noload")

    def __repr__(self):
        return f"<ExternalSource(name={self.name})>"
