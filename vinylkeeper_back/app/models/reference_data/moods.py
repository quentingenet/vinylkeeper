from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.models.base import Base


class Mood(Base):
    __tablename__ = "moods"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)

    collections = relationship(
        "Collection", back_populates="mood", lazy="selectin")

    def __repr__(self):
        return f"<Mood(name={self.name})>"
