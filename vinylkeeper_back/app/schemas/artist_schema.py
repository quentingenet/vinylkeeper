from datetime import datetime
from typing import Optional, List

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator
)


class ArtistBase(BaseModel):
    """Base schema for artist data."""
    external_artist_id: str = Field(
        ...,
        pattern=r"^\d+$",
        description="External artist ID (numeric string)"
    )
    title: str = Field(..., description="Name of the artist")
    image_url: Optional[str] = Field(
        None, description="URL of the artist image")
    source: str = Field(...,
                        description="Source of the artist data (e.g., 'DISCOGS')")

    model_config = ConfigDict(from_attributes=True)


class ArtistCreate(ArtistBase):
    """Schema for creating a new artist."""
    pass


class ArtistUpdate(BaseModel):
    """Schema for updating an artist."""
    external_artist_id: Optional[str] = Field(
        None,
        pattern=r"^\d+$",
        description="External artist ID (numeric string)"
    )

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    @model_validator(mode='after')
    def validate_fields(self) -> 'ArtistUpdate':
        """Validate that at least one field is provided for update."""
        if not any(v is not None for v in self.model_dump().values()):
            raise ValueError("At least one field must be provided for update")
        return self


class ArtistInDB(ArtistBase):
    """Schema for artist data as stored in database."""
    id: int = Field(gt=0)
    owner_id: int = Field(gt=0, description="ID of the artist owner")
    registered_at: datetime
    updated_at: datetime


class ArtistResponse(ArtistInDB):
    """Schema for artist data in API responses."""
    albums: Optional[List[dict]] = None
    collections_count: int = Field(default=0)


class ArtistDetailResponse(ArtistResponse):
    """Detailed artist response including all related data."""
    collections: List[dict] = Field(
        default_factory=list)  # Will be populated with collection data
    # Will be populated with wishlist data
    wishlist_items: List[dict] = Field(default_factory=list)
