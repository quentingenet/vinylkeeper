from sqlalchemy import Table, Column, Integer, ForeignKey
from app.models.base import Base

collection_album = Table(
    "collection_album",
    Base.metadata,
    Column("collection_id", Integer, ForeignKey(
        "collections.id", ondelete="CASCADE"), primary_key=True),
    Column("album_id", Integer, ForeignKey(
        "albums.id", ondelete="CASCADE"), primary_key=True)
)

collection_artist = Table(
    "collection_artist",
    Base.metadata,
    Column("collection_id", Integer, ForeignKey(
        "collections.id", ondelete="CASCADE"), primary_key=True),
    Column("artist_id", Integer, ForeignKey(
        "artists.id", ondelete="CASCADE"), primary_key=True)
)

album_artist = Table(
    "album_artist",
    Base.metadata,
    Column("album_id", Integer, ForeignKey(
        "albums.id", ondelete="CASCADE"), primary_key=True),
    Column("artist_id", Integer, ForeignKey(
        "artists.id", ondelete="CASCADE"), primary_key=True)
)

collection_likes = Table(
    "collection_likes",
    Base.metadata,
    Column("user_id", Integer, ForeignKey(
        "users.id", ondelete="CASCADE"), primary_key=True),
    Column("collection_id", Integer, ForeignKey(
        "collections.id", ondelete="CASCADE"), primary_key=True)
)
