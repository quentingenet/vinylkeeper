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
    title: Optional[str] = Field(
        None,
        description="Name of the artist"
    )
    image_url: Optional[str] = Field(
        None,
        description="URL of the artist image"
    )
    external_source_id: int = Field(
        ...,
        description="Source of the artist data (e.g., 'DISCOGS')"
    )

    model_config = ConfigDict(from_attributes=True)

    @field_validator("external_artist_id")
    @classmethod
    def validate_external_artist_id(cls, v: str) -> str:
        if not v.isdigit():
            raise ValueError("External artist ID must be numeric")
        return v


class ArtistCreate(ArtistBase):
    """Schema for creating a new artist."""
    pass


class ArtistUpdate(BaseModel):
    """Schema for updating an artist."""
    title: Optional[str] = None
    image_url: Optional[str] = None

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
    created_at: datetime
    updated_at: datetime


class ArtistResponse(ArtistInDB):
    """Schema for artist data in API responses."""
    collections_count: int = Field(default=0)


class ArtistDetailResponse(ArtistResponse):
    """Detailed artist response including all related data."""
    collections: List[dict] = Field(default_factory=list)
