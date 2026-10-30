from typing import Optional
from pydantic import Field, field_validator
from datetime import datetime

from app.schemas import BaseSchema
from app.utils.discogs_release import clean_artist_name


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

    @field_validator("title")
    @classmethod
    def clean_title(cls, v: Optional[str]) -> Optional[str]:
        # The name as the search shows it, without the Discogs homonym marker: "Trust (2)" -> "Trust"
        return clean_artist_name(v) if v else v


class ArtistInDB(ArtistBase):
    """Schema for artist data as stored in database."""
    id: int = Field(gt=0)
    created_at: datetime
    updated_at: datetime


class ArtistResponse(ArtistInDB):
    """Schema for artist data in API responses."""
    collections_count: int = Field(default=0)
