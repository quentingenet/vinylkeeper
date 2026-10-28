from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.models.base import Base


class PlaceType(Base):
    __tablename__ = "place_types"

    id = Column(Integer, primary_key=True)
    name = Column(String(150), unique=True, nullable=False)

    # Never loaded: looking a reference value up must not load all the rows pointing to it
    places = relationship(
        "Place", back_populates="place_type", lazy="noload")

    def __repr__(self):
        return f"<PlaceType(name={self.name})>"
