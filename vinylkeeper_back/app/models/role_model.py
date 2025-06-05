from sqlalchemy import Column, Integer, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.models.base import Base
from app.core.enums import RoleEnum


class Role(Base):
    """Role model."""

    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(SQLEnum(RoleEnum), unique=True, nullable=False)

    users = relationship("User", back_populates="role", lazy="selectin")

    def __repr__(self):
        return f"<Role(name={self.name})>"
