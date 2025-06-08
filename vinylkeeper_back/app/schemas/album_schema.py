from typing import Optional, List
from pydantic import (
    BaseModel,
    Field,
    ConfigDict,
    field_validator,
    model_validator,
)
from datetime import datetime
from app.core.enums import StateEnum, MoodEnum


class AlbumBase(BaseModel):
    """Base schema for album data."""
    external_album_id: str = Field(
        ...,
        pattern=r"^\d+$",
        description="External Album ID (numeric string)"
    )
    title: str = Field(..., description="Title of the album")
    image_url: Optional[str] = Field(
        None, description="URL of the album cover image")
    source: str = Field(...,
                        description="Source of the album data (e.g., 'discogs')")
    state_record: Optional[StateEnum] = Field(
        None, description="Physical state of the vinyl record")
    state_cover: Optional[StateEnum] = Field(
        None, description="Physical state of the album cover")
    acquisition_date: Optional[datetime] = Field(
        None, description="Date when the album was acquired")
    purchase_price: Optional[int] = Field(
        None, description="Price paid for the album in cents")

    model_config = ConfigDict(from_attributes=True)

    @field_validator("external_album_id")
    @classmethod
    def validate_external_album_id(cls, v: str) -> str:
        """Ensure the ID is a non-empty numeric string."""
        if not v.isdigit():
            raise ValueError("External Album ID must be numeric")
        return v


class AlbumCreate(AlbumBase):
    """Schema for creating a new album."""
    pass


class AlbumUpdate(BaseModel):
    """Schema for updating an album."""
    external_album_id: Optional[str] = Field(
        None,
        pattern=r"^\d+$",
        description="External Album ID (numeric string)"
    )
    state_record: Optional[StateEnum] = None
    state_cover: Optional[StateEnum] = None
    acquisition_date: Optional[datetime] = None
    purchase_price: Optional[int] = None

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    @model_validator(mode='after')
    def validate_fields(self) -> 'AlbumUpdate':
        """Validate that at least one field is provided for update."""
        if not any(v is not None for v in self.model_dump().values()):
            raise ValueError("At least one field must be provided for update")
        return self


class AlbumInDB(AlbumBase):
    """Schema for album data as stored in database."""
    id: int = Field(gt=0)
    owner_id: int = Field(gt=0, description="ID of the album owner")
    registered_at: datetime
    updated_at: datetime


class AlbumResponse(AlbumInDB):
    """Schema for album data in API responses."""
    artists: Optional[List[dict]] = None
    collections_count: int = Field(default=0)
    loans_count: int = Field(default=0)
    wishlist_count: int = Field(default=0)


class AlbumDetailResponse(AlbumResponse):
    """Detailed album response including related lists."""
    collections: List[dict] = Field(default_factory=list)
    loans:       List[dict] = Field(default_factory=list)
    wishlist_items: List[dict] = Field(default_factory=list)
