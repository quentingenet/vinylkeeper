from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from api.db.base import Base


class Genre(Base):
    __tablename__ = "genres"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, index=True)
    albums = relationship("Album", back_populates="genre")
