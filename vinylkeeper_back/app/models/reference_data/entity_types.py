# app/models/reference/entity_type_model.py
from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.models.base import Base


class EntityType(Base):
    __tablename__ = "entity_types"

    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True, nullable=False)

    wishlist_items = relationship(
        "Wishlist", back_populates="entity_type", lazy="selectin")

    def __repr__(self):
        return f"<EntityType(name={self.name})>"
