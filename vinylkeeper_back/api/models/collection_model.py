from sqlalchemy import Boolean, Column, DateTime, Integer, String, ForeignKey, Table, func
from sqlalchemy.orm import relationship
from api.db.base import Base


collection_artist = Table(
    "collection_artist",
    Base.metadata,
    Column("collection_id", ForeignKey("collections.id"), primary_key=True),
    Column("artist_id", ForeignKey("artists.id"), primary_key=True),
)

collection_genre = Table(
    "collection_genre",
    Base.metadata,
    Column("collection_id", ForeignKey("collections.id"), primary_key=True),
    Column("genre_id", ForeignKey("genres.id"), primary_key=True),
)

collection_album = Table(
    "collection_album",
    Base.metadata,
    Column("collection_id", ForeignKey("collections.id"), primary_key=True),
    Column("album_id", ForeignKey("albums.id"), primary_key=True),
)

class Collection(Base):
    __tablename__ = "collections"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True)
    description = Column(String(255), nullable=True)
    is_public = Column(Boolean, default=False)

    user_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="collections")

    albums = relationship("Album", secondary="collection_album", back_populates="collections")
    artists = relationship("Artist", secondary="collection_artist", back_populates="collections")
    genres = relationship("Genre", secondary="collection_genre", back_populates="collections")

    registered_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
