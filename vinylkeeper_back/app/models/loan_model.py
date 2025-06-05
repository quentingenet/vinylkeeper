from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    func,
)
from sqlalchemy.orm import relationship

from app.db.base import Base


class Loan(Base):
    """Model representing a loan of an album to a user."""

    __tablename__ = "loans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    album_id = Column(Integer, ForeignKey("albums.id", ondelete="CASCADE"), nullable=False, index=True)
    borrower_name = Column(String(255), nullable=False)
    start_date = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=True)
    is_returned = Column(Boolean, default=False, nullable=False)

    user = relationship("User", back_populates="loans")
    album = relationship("Album", back_populates="loans")
