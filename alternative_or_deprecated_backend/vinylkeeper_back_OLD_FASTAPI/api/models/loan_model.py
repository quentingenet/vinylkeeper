from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from api.db.base import Base
from sqlalchemy.sql import func


class Loan(Base):
    __tablename__ = "loans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    album_id = Column(Integer, ForeignKey("albums.id"))
    loan_date = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    return_date = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="loans")
    album = relationship("Album", back_populates="loans")
