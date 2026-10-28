from typing import Optional
from pydantic import Field, field_validator
from datetime import datetime

from app.schemas import BaseSchema


class AlbumBase(BaseSchema):
    """Base schema for album data."""
    external_album_id: str = Field(
        ...,
        pattern=r"^\d+$",
        description="External Album ID (numeric string)"
    )
    external_source_id: int = Field(
        ...,
        description="Source of the album data (e.g., 'discogs')"
    )
    external_source: Optional[dict] = Field(
        None,
        description="External source information with id and name"
    )
    title: Optional[str] = Field(
        None,
        description="Cached title of the album"
    )
    image_url: Optional[str] = Field(
        None,
        description="URL of the album cover image"
    )

    @field_validator("external_album_id")
    @classmethod
    def validate_external_album_id(cls, v: str) -> str:
        if not v.isdigit():
            raise ValueError("External Album ID must be numeric")
        return v


class AlbumCreate(AlbumBase):
    """Schema for creating a new album."""
    pass


class AlbumInDB(AlbumBase):
    """Schema for album data as stored in database."""
    id: int = Field(gt=0)
    created_at: datetime
    updated_at: datetime


class AlbumResponse(AlbumInDB):
    """Schema for album data in API responses."""
    collections_count: int = Field(default=0)
    loans_count: int = Field(default=0)
