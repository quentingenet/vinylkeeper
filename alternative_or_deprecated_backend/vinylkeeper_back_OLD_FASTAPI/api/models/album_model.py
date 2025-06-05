import enum
from sqlalchemy import Column, Integer, String, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from api.db.base import Base

class ConditionEnum(enum.Enum):
    MINT = "Mint"
    NEAR_MINT = "Near Mint"
    VERY_GOOD = "Very Good"
    GOOD = "Good"
    FAIR = "Fair"
    POOR = "Poor"


class MoodEnum(enum.Enum):
    HAPPY = "Happy"
    SAD = "Sad"
    EXCITED = "Excited"
    CALM = "Calm"
    ANGRY = "Angry"
    RELAXED = "Relaxed"
    ENERGETIC = "Energetic"
    MELANCHOLIC = "Melancholic"


class Album(Base):
    __tablename__ = "albums"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), index=True)
    artist_id = Column(Integer, ForeignKey("artists.id"))
    genre_id = Column(Integer, ForeignKey("genres.id"))
    release_year = Column(Integer, nullable=True)
    description = Column(Text, nullable=True)
    cover_condition = Column(Enum(ConditionEnum), nullable=True)
    record_condition = Column(Enum(ConditionEnum), nullable=True)
    mood = Column(Enum(MoodEnum), nullable=True)

    artist = relationship("Artist", back_populates="albums")
    collections = relationship("Collection", secondary="collection_album", back_populates="albums")
    ratings = relationship("Rating", back_populates="album")
    loans = relationship("Loan", back_populates="album")
    wishlist_entries = relationship("Wishlist", back_populates="album")

