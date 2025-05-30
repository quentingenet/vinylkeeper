from sqlalchemy import Column, Integer, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from api.db.base import Base


class CollectionExternalReference(Base):
    __tablename__ = "collection_external_references"

    id = Column(Integer, primary_key=True, index=True)
    collection_id = Column(Integer, ForeignKey("collections.id"), nullable=False)
    external_reference_id = Column(Integer, ForeignKey("external_references.id"), nullable=False)
    
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    
    # Relationships
    collection = relationship("Collection", back_populates="external_references")
    external_reference = relationship("ExternalReference", back_populates="collection_entries") 