from datetime import datetime
from typing import Optional, List

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator
)


class AlbumBase(BaseModel):
    """Base schema for album data."""
    title: str = Field(
        min_length=1,
        max_length=255,
        description="Album title must be between 1 and 255 characters"
    )
    release_id: str = Field(
        min_length=36,
        max_length=36,
        description="MusicBrainz Release ID (36 characters)"
    )
    release_year: Optional[int] = Field(
        None,
        ge=1900,
        le=2100,
        description="Year of release (between 1900 and 2100)"
    )
    artist_id: int = Field(
        gt=0,
        description="ID of the album's artist"
    )

    model_config = ConfigDict(from_attributes=True)

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        """Validate album title."""
        if not v or len(v.strip()) == 0:
            raise ValueError("Album title cannot be empty")
        return v.strip()

    @field_validator("release_id")
    @classmethod
    def validate_release_id(cls, v: str) -> str:
        """Validate MusicBrainz Release ID format."""
        if len(v) != 36:
            raise ValueError("Release ID must be exactly 36 characters long")
        if not all(c in "0123456789abcdef-" for c in v.lower()):
            raise ValueError("Release ID must contain only hexadecimal characters and hyphens")
        return v

    @field_validator("release_year")
    @classmethod
    def validate_release_year(cls, v: Optional[int]) -> Optional[int]:
        """Validate release year."""
        if v is not None:
            if not isinstance(v, int):
                raise ValueError("Release year must be an integer")
            if v < 1900 or v > 2100:
                raise ValueError("Release year must be between 1900 and 2100")
        return v


class AlbumCreate(AlbumBase):
    """Schema for creating a new album."""
    pass


class AlbumUpdate(BaseModel):
    """Schema for updating an album."""
    title: Optional[str] = Field(
        None,
        min_length=1,
        max_length=255
    )
    release_id: Optional[str] = Field(
        None,
        min_length=36,
        max_length=36
    )
    release_year: Optional[int] = Field(
        None,
        ge=1900,
        le=2100
    )
    artist_id: Optional[int] = Field(
        None,
        gt=0
    )

    model_config = ConfigDict(extra="forbid")

    @model_validator(mode='after')
    def validate_fields(self) -> 'AlbumUpdate':
        """Validate that at least one field is provided for update."""
        if not any(v is not None for v in self.model_dump().values()):
            raise ValueError("At least one field must be provided for update")
        return self


class AlbumInDB(AlbumBase):
    """Schema for album data as stored in database."""
    id: int = Field(gt=0)


class AlbumResponse(AlbumInDB):
    """Schema for album data in API responses."""
    artist: Optional[dict] = None  # Will be populated with artist data
    collections_count: int = Field(default=0)
    loans_count: int = Field(default=0)
    wishlist_count: int = Field(default=0)


class AlbumDetailResponse(AlbumResponse):
    """Detailed album response including all related data."""
    collections: List[dict] = Field(default_factory=list)  # Will be populated with collection data
    loans: List[dict] = Field(default_factory=list)  # Will be populated with loan data
    wishlist_items: List[dict] = Field(default_factory=list)  # Will be populated with wishlist data 