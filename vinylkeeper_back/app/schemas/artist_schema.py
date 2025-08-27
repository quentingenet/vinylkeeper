from typing import Optional, List
from pydantic import Field, field_validator
from datetime import datetime

from app.schemas import BaseSchema


class ArtistBase(BaseSchema):
    """Base schema for artist data."""
    external_artist_id: str = Field(
        ...,
        pattern=r"^\d+$",
        description="External Artist ID (numeric string)"
    )
    external_source_id: int = Field(
        ...,
        description="Source of the artist data (e.g., 'discogs')"
    )
    external_source: Optional[dict] = Field(
        None,
        description="External source information with id and name"
    )
    title: Optional[str] = Field(
        None,
        description="Cached title of the artist"
    )
    artist: Optional[str] = Field(
        None,
        description="Artist name (alias for title for frontend compatibility)"
    )
    image_url: Optional[str] = Field(
        None,
        description="URL of the artist image"
    )

    @field_validator("external_artist_id")
    @classmethod
    def validate_external_artist_id(cls, v: str) -> str:
        if not v.isdigit():
            raise ValueError("External Artist ID must be numeric")
        return v


class ArtistCreate(ArtistBase):
    """Schema for creating a new artist."""
    pass


class ArtistUpdate(BaseSchema):
    """Schema for updating an artist."""
    title: Optional[str] = None
    image_url: Optional[str] = None


class ArtistInDB(ArtistBase):
    """Schema for artist data as stored in database."""
    id: int = Field(gt=0)
    created_at: datetime
    updated_at: datetime


class ArtistResponse(ArtistInDB):
    """Schema for artist data in API responses."""
    collections_count: int = Field(default=0)


class ArtistDetailResponse(ArtistResponse):
    """Detailed artist response including related lists."""
    collections: List[dict] = Field(default_factory=list)
