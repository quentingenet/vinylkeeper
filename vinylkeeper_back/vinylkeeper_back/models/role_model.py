import enum
from sqlalchemy import Column, Enum, Integer
from sqlalchemy.orm import relationship
from vinylkeeper_back.db.base import Base


class RoleEnum(enum.Enum):
    ADMIN = "admin"
    USER = "user"


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(Enum(RoleEnum), unique=True, index=True)
    users = relationship("User", back_populates="role")
