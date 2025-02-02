from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import relationship
from vinylkeeper_back.db.base import Base


class Rating(Base):
    __tablename__ = "ratings"

    id = Column(Integer, primary_key=True, index=True)
    rating = Column(Integer, nullable=True)
    comment = Column(String(255))
    user_id = Column(Integer, ForeignKey("users.id"))
    album_id = Column(Integer, ForeignKey("albums.id"))

    user = relationship("User", back_populates="ratings")
    album = relationship("Album", back_populates="ratings")

    __table_args__ = (UniqueConstraint('user_id', 'album_id', name='_user_album_uc',),
                      CheckConstraint('rating >= 0 AND rating <= 5', name='rating_range'))
