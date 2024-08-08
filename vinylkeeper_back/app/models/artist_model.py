from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.orm import relationship
from app.db.base import Base


class Artist(Base):
    __tablename__ = "artists"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, index=True)
    country = Column(String(100), nullable=True)
    biography = Column(Text, nullable=True)
    albums = relationship("Album", back_populates="artist")