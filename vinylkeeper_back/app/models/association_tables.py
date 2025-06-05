from sqlalchemy import (
    Table, Column, Integer, ForeignKey
)
from app.models.base import Base

# Association table between Collections and Artists
collection_artist = Table(
    "collection_artist",
    Base.metadata,
    Column("collection_id", Integer, ForeignKey(
        "collections.id", ondelete="CASCADE"), primary_key=True),
    Column("artist_id", Integer, ForeignKey(
        "artists.id", ondelete="CASCADE"), primary_key=True)
)
