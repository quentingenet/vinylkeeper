from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.models.base import Base


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True, nullable=False)

    # Never loaded: looking a reference value up must not load all the rows pointing to it
    users = relationship("User", back_populates="role", lazy="noload")

    def __repr__(self):
        return f"<Role(name={self.name})>"
