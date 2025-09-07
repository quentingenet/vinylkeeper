# app/models/reference/vinyl_status_model.py

from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship, validates
from app.models.base import Base


class VinylState(Base):
    __tablename__ = "vinyl_states"

    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=True)
    
    record_collections = relationship(
        "CollectionAlbum",
        foreign_keys="CollectionAlbum.state_record",
        back_populates="state_record_ref",
        lazy="selectin"
    )
    cover_collections = relationship(
        "CollectionAlbum",
        foreign_keys="CollectionAlbum.state_cover",
        back_populates="state_cover_ref",
        lazy="selectin"
    )

    def __repr__(self):
        return f"<VinylStatus(name={self.name})>"

    @validates("name")
    def validate_name(self, key, value):
        if not value or len(value.strip()) == 0:
            raise ValueError("Vinyl status name cannot be empty")
        return value.strip()
