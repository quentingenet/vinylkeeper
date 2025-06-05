from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship
from app.models.base import Base


class Wishlist(Base):
    __tablename__ = "wishlist"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "external_id",
            "entity_type_id",
            "external_source_id",
            name="uq_wishlist_user_entity_source"
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey(
        "users.id", ondelete="CASCADE"), nullable=False)
    external_id = Column(String(255), nullable=False)
    entity_type_id = Column(Integer, ForeignKey(
        "entity_types.id", ondelete="CASCADE"), nullable=False)
    external_source_id = Column(Integer, ForeignKey(
        "external_sources.id", ondelete="CASCADE"), nullable=False)

    title = Column(String(512), nullable=True)
    image_url = Column(String(1024), nullable=True)
    created_at = Column(DateTime(timezone=True),
                        server_default=func.now(), nullable=False)

    user = relationship(
        "User", back_populates="wishlist_items", lazy="selectin")
    entity_type = relationship(
        "EntityType", back_populates="wishlist_items", lazy="selectin")
    external_source = relationship(
        "ExternalSource", back_populates="wishlist_items", lazy="selectin")
