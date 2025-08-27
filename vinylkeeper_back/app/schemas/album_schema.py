from typing import Optional, List
from pydantic import Field, field_validator, model_validator
from datetime import datetime

from app.schemas import BaseSchema
from app.core.enums import VinylStateEnum


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
    artist: Optional[str] = Field(
        None,
        description="Artist name for the album"
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


class AlbumInCollection(BaseSchema):
    """Schema for album data in a collection context."""
    state_record: Optional[str] = Field(
        None,
        description="Name of the vinyl record condition (e.g., 'near_mint')"
    )
    state_cover: Optional[str] = Field(
        None,
        description="Name of the album cover condition (e.g., 'near_mint')"
    )
    acquisition_month_year: Optional[str] = Field(
        None,
        description="Acquisition month and year in format YYYY-MM (e.g., '2024-06')"
    )


class AlbumCreate(AlbumBase):
    """Schema for creating a new album."""
    pass


class AlbumUpdate(AlbumInCollection):
    """Schema for updating an album in a collection."""
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


class AlbumDetailResponse(AlbumResponse):
    """Detailed album response including related lists."""
    collections: List[dict] = Field(default_factory=list)
    loans: List[dict] = Field(default_factory=list)
    wishlist_items: List[dict] = Field(default_factory=list)
