"""
Association tables for many-to-many relationships in the application.
These tables manage complex relationships between different entities
without requiring complete intermediate models.
"""

from sqlalchemy import Table, Column, Integer, ForeignKey, DateTime, Enum as SQLEnum
from app.models.base import Base
from app.core.enums import StateEnum, MoodEnum

# Association table between Collections and Albums
# Allows a collection to contain multiple albums and an album to belong to multiple collections
collection_album = Table(
    "collection_album",
    Base.metadata,
    Column("collection_id", Integer, ForeignKey(
        "collections.id", ondelete="CASCADE"), primary_key=True),
    Column("album_id", Integer, ForeignKey(
        "albums.id", ondelete="CASCADE"), primary_key=True),
    Column("owner_id", Integer, ForeignKey(
        "users.id", ondelete="CASCADE"), nullable=False, index=True),
    Column("state_record", SQLEnum(StateEnum, name="stateenum"),
           nullable=True, comment="Physical state of the vinyl record"),
    Column("state_cover", SQLEnum(StateEnum, name="stateenum"),
           nullable=True, comment="Physical state of the album cover"),
    Column("acquisition_date", DateTime,
           nullable=True, comment="Date when the album was acquired"),
    Column("purchase_price", Integer,
           nullable=True, comment="Price paid for the album in cents")
)

# Association table between Collections and Artists
# Allows a collection to contain multiple artists and an artist to belong to multiple collections
collection_artist = Table(
    "collection_artist",
    Base.metadata,
    Column("collection_id", Integer, ForeignKey(
        "collections.id", ondelete="CASCADE"), primary_key=True),
    Column("artist_id", Integer, ForeignKey(
        "artists.id", ondelete="CASCADE"), primary_key=True),
    Column("owner_id", Integer, ForeignKey(
        "users.id", ondelete="CASCADE"), nullable=False, index=True)
)

# Association table between Albums and Artists
# Allows an album to have multiple artists and an artist to have multiple albums
album_artist = Table(
    "album_artist",
    Base.metadata,
    Column("album_id", Integer, ForeignKey(
        "albums.id", ondelete="CASCADE"), primary_key=True),
    Column("artist_id", Integer, ForeignKey(
        "artists.id", ondelete="CASCADE"), primary_key=True)
)

# Association table for collection likes
# Allows a user to like multiple collections and a collection to be liked by multiple users
collection_likes = Table(
    "collection_likes",
    Base.metadata,
    Column("user_id", Integer, ForeignKey(
        "users.id", ondelete="CASCADE"), primary_key=True),
    Column("collection_id", Integer, ForeignKey(
        "collections.id", ondelete="CASCADE"), primary_key=True)
)
