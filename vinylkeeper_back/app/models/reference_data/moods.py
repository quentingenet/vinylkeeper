from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.models.base import Base


class Mood(Base):
    __tablename__ = "moods"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(String(255), nullable=True)

    # raise: never read (Collection.mood is the direction used). selectin loaded
    # every collection of a mood each time a mood was loaded.
    collections = relationship(
        "Collection", back_populates="mood", lazy="raise")

    def __repr__(self):
        return f"<Mood(name={self.name})>"
