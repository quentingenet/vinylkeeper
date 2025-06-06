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
    name: str = Field(
        min_length=1,
        max_length=255,
        description="Artist name must be between 1 and 255 characters"
    )
    musicbrainz_id: str = Field(
        min_length=36,
        max_length=36,
        description="MusicBrainz Artist ID (36 characters)"
    )

    model_config = ConfigDict(from_attributes=True)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Validate artist name."""
        if not v or len(v.strip()) == 0:
            raise ValueError("Artist name cannot be empty")
        return v.strip()

    @field_validator("musicbrainz_id")
    @classmethod
    def validate_musicbrainz_id(cls, v: str) -> str:
        """Validate MusicBrainz Artist ID format."""
        if len(v) != 36:
            raise ValueError("MusicBrainz ID must be exactly 36 characters long")
        if not all(c in "0123456789abcdef-" for c in v.lower()):
            raise ValueError("MusicBrainz ID must contain only hexadecimal characters and hyphens")
        return v


class ArtistCreate(ArtistBase):
    """Schema for creating a new artist."""
    pass


class ArtistUpdate(BaseModel):
    """Schema for updating an artist."""
    name: Optional[str] = Field(
        None,
        min_length=1,
        max_length=255
    )
    musicbrainz_id: Optional[str] = Field(
        None,
        min_length=36,
        max_length=36
    )

    model_config = ConfigDict(extra="forbid")

    @model_validator(mode='after')
    def validate_fields(self) -> 'ArtistUpdate':
        """Validate that at least one field is provided for update."""
        if not any(v is not None for v in self.model_dump().values()):
            raise ValueError("At least one field must be provided for update")
        return self


class ArtistInDB(ArtistBase):
    """Schema for artist data as stored in database."""
    id: int = Field(gt=0)


class ArtistResponse(ArtistInDB):
    """Schema for artist data in API responses."""
    albums: List[dict] = Field(default_factory=list)  # Will be populated with album data
    collections_count: int = Field(default=0)
    wishlist_count: int = Field(default=0)


class ArtistDetailResponse(ArtistResponse):
    """Detailed artist response including all related data."""
    collections: List[dict] = Field(default_factory=list)  # Will be populated with collection data
    wishlist_items: List[dict] = Field(default_factory=list)  # Will be populated with wishlist data 