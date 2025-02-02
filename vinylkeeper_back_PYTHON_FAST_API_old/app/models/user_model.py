from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(255), unique=True, index=True)
    email = Column(String(255), unique=True, index=True)
    password = Column(String(255))
    is_accepted_terms = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    last_login = Column(DateTime(timezone=True), nullable=True)
    registered_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    timezone = Column(String(100), nullable=False, server_default="UTC")

    collections = relationship("Collection", back_populates="owner")
    ratings = relationship("Rating", back_populates="user")
    loans = relationship("Loan", back_populates="user")
    wishlist_items = relationship("Wishlist", back_populates="user")