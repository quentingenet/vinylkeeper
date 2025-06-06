from sqlalchemy import Column, Enum, Integer
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.core.enums import RoleEnum


class Role(Base):
    """Model representing a user role in the system."""
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(Enum(RoleEnum), unique=True, index=True, nullable=False)
    users = relationship("User", back_populates="role", cascade="all, delete-orphan")
