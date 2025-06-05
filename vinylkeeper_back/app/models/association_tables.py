from sqlalchemy import Table, Column, Integer, ForeignKey
from app.db.base import Base

collection_album = Table(
    "collection_album",
    Base.metadata,
    Column("collection_id", Integer, ForeignKey("collections.id", ondelete="CASCADE"), primary_key=True),
    Column("album_id", Integer, ForeignKey("albums.id", ondelete="CASCADE"), primary_key=True),
)

collection_artist = Table(
    "collection_artist",
    Base.metadata,
    Column("collection_id", Integer, ForeignKey("collections.id", ondelete="CASCADE"), primary_key=True),
    Column("artist_id", Integer, ForeignKey("artists.id", ondelete="CASCADE"), primary_key=True),
)
