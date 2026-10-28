from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import relationship
from app.models.base import Base


class AlbumMood(Base):
    """Association between an album and a mood (global to the album, shared by all users)."""
    __tablename__ = "album_moods"

    __table_args__ = (
        CheckConstraint("source IN ('llm', 'user')", name="ck_album_moods_source"),
        Index("ix_album_moods_mood_id", "mood_id"),
    )

    album_id = Column(Integer, ForeignKey(
        "albums.id", ondelete="CASCADE"), primary_key=True)
    mood_id = Column(Integer, ForeignKey(
        "moods.id", ondelete="RESTRICT"), primary_key=True)

    source = Column(String(10), nullable=False,
                    comment="Who assigned the mood: 'llm' or 'user'")

    created_at = Column(DateTime(timezone=True),
                        server_default=func.now(), nullable=False)

    # One-directional on purpose: Album and Mood are left untouched; album
    # deletion is handled by the ON DELETE CASCADE foreign key.
    album = relationship("Album", lazy="raise")
    mood = relationship("Mood", lazy="raise")

    def __repr__(self):
        return f"<AlbumMood(album_id={self.album_id}, mood_id={self.mood_id}, source={self.source!r})>"
