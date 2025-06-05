from typing import Optional, List
from pydantic import (
    BaseModel,
    Field,
    ConfigDict,
    field_validator,
    model_validator,
)
from datetime import datetime
from app.core.enums import VinylStateEnum


class AlbumBase(BaseModel):
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
    title: Optional[str] = Field(
        None,
        description="Cached title of the album"
    )
    image_url: Optional[str] = Field(
        None,
        description="URL of the album cover image"
    )

    model_config = ConfigDict(from_attributes=True)

    @field_validator("external_album_id")
    @classmethod
    def validate_external_album_id(cls, v: str) -> str:
        if not v.isdigit():
            raise ValueError("External Album ID must be numeric")
        return v


class AlbumInCollection(BaseModel):
    """Schema for album data in a collection context."""
    state_record: Optional[VinylStateEnum] = Field(
        None,
        description="Physical state of the vinyl record"
    )
    state_cover: Optional[VinylStateEnum] = Field(
        None,
        description="Physical state of the album cover"
    )
    acquisition_date: Optional[datetime] = Field(
        None,
        description="Date when the album was acquired"
    )
    purchase_price: Optional[int] = Field(
        None,
        description="Price paid for the album in cents"
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
