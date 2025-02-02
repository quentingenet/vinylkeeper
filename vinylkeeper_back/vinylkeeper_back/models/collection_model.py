from sqlalchemy import Boolean, Column, DateTime, Integer, String, ForeignKey, func
from sqlalchemy.orm import relationship
from vinylkeeper_back.db.base import Base


class Collection(Base):
    __tablename__ = "collections"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    is_public = Column(Boolean, default=False)
    description = Column(String(255), nullable=True)
    owner = relationship("User", back_populates="collections")
    albums = relationship("Album", back_populates="collection")
    registered_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())