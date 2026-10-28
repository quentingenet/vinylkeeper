from sqlalchemy import CheckConstraint, Column, ForeignKey, Index, Integer, SmallInteger, String
from sqlalchemy.orm import relationship
from app.models.base import Base


class TagMoodRule(Base):
    """
    How much a Discogs style or genre suggests a mood. Synced from
    app/data/tag_mood_rules.py (source of truth) by app.cli.sync_mood_rules.
    """
    __tablename__ = "tag_mood_rules"

    __table_args__ = (
        CheckConstraint("weight BETWEEN 1 AND 3", name="ck_tag_mood_rules_weight"),
        Index("ix_tag_mood_rules_mood_id", "mood_id"),
    )

    tag = Column(String(100), primary_key=True, comment="Discogs style or genre name, exact case")
    mood_id = Column(Integer, ForeignKey("moods.id", ondelete="RESTRICT"), primary_key=True)
    weight = Column(SmallInteger, nullable=False, comment="1 = hint, 2 = typical, 3 = defining")

    mood = relationship("Mood", lazy="raise")

    def __repr__(self):
        return f"<TagMoodRule(tag={self.tag!r}, mood_id={self.mood_id}, weight={self.weight})>"
