# app/models/reference/moderation_status_model.py
from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.models.base import Base


class ModerationStatus(Base):
    __tablename__ = "moderation_statuses"

    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True, nullable=False)

    # Never loaded: looking a reference value up must not load all the rows pointing to it
    moderation_requests = relationship(
        "ModerationRequest", back_populates="status", lazy="noload")

    def __repr__(self):
        return f"<ModerationStatus(name={self.name})>"
