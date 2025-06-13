from pydantic import BaseModel, Field
from typing import Optional
from app.core.enums import EntityTypeEnum


class WishlistCreate(BaseModel):
    """
    Schema for creating a new wishlist entry.
    """
    discogs_album_id: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Discogs Album ID (1–255 characters)"
    )
    discogs_artist_id: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Discogs Artist ID (1–255 characters)"
    )
    discogs_entity_type: EntityTypeEnum = Field(
        ...,
        description="Type of the Discogs entity to wishlist"
    )

    class Config:
        # Forbid extra fields to catch misnamed properties early
        extra = "forbid"
        # Allow ORM objects to be passed directly
        orm_mode = True


class WishlistResponse(BaseModel):
    """
    Response schema for a wishlist entry.
    """
    id: int
    user_uuid: int
    discogs_album_id: str
    discogs_artist_id: str
    discogs_entity_type: EntityTypeEnum
    added_at: Optional[str]

    class Config:
        orm_mode = True
