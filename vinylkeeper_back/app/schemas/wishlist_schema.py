from datetime import datetime
from typing import Optional

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator
)


class WishlistBase(BaseModel):
    """Base schema for wishlist data."""
    user_id: int = Field(
        gt=0,
        description="ID of the user owning the wishlist"
    )
    album_id: Optional[int] = Field(
        None,
        gt=0,
        description="ID of the album in wishlist"
    )
    artist_id: Optional[int] = Field(
        None,
        gt=0,
        description="ID of the artist in wishlist"
    )

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode='after')
    def validate_exclusivity(self) -> 'WishlistBase':
        """Validate that either album_id or artist_id is set, but not both."""
        if self.album_id is not None and self.artist_id is not None:
            raise ValueError("Cannot set both album_id and artist_id")
        if self.album_id is None and self.artist_id is None:
            raise ValueError("Must set either album_id or artist_id")
        return self


class WishlistCreate(WishlistBase):
    """Schema for creating a new wishlist item."""
    pass


class WishlistUpdate(BaseModel):
    """Schema for updating a wishlist item."""
    album_id: Optional[int] = Field(
        None,
        gt=0
    )
    artist_id: Optional[int] = Field(
        None,
        gt=0
    )

    model_config = ConfigDict(extra="forbid")

    @model_validator(mode='after')
    def validate_fields(self) -> 'WishlistUpdate':
        """Validate that at least one field is provided for update."""
        if not any(v is not None for v in self.model_dump().values()):
            raise ValueError("At least one field must be provided for update")
        if self.album_id is not None and self.artist_id is not None:
            raise ValueError("Cannot set both album_id and artist_id")
        return self


class WishlistInDB(WishlistBase):
    """Schema for wishlist data as stored in database."""
    id: int = Field(gt=0)
    added_at: datetime


class WishlistResponse(WishlistInDB):
    """Schema for wishlist data in API responses."""
    album: Optional[dict] = None  # Will be populated with album data
    artist: Optional[dict] = None  # Will be populated with artist data
