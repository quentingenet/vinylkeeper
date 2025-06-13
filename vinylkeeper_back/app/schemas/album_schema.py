from typing import Optional, List
from pydantic import (
    BaseModel,
    Field,
    ConfigDict,
    field_validator,
    model_validator,
)


class AlbumBase(BaseModel):
    """Base schema for album data."""
    discogs_album_id: str = Field(
        ...,
        regex=r"^\d+$",
        description="Discogs Album ID (numeric string)"
    )

    model_config = ConfigDict(from_attributes=True)

    @field_validator("discogs_album_id")
    @classmethod
    def validate_discogs_album_id(cls, v: str) -> str:
        """Ensure the ID is a non-empty numeric string."""
        if not v.isdigit():
            raise ValueError("Discogs Album ID must be numeric")
        return v


class AlbumCreate(AlbumBase):
    """Schema for creating a new album."""
    pass


class AlbumUpdate(BaseModel):
    """Schema for updating an album."""
    discogs_album_id: Optional[str] = Field(
        None,
        regex=r"^\d+$",
        description="Optional new Discogs Album ID"
    )

    model_config = ConfigDict(extra="forbid")

    @model_validator(mode="after")
    def check_at_least_one_field(self) -> "AlbumUpdate":
        """Require at least one field to update."""
        if not any(self.model_dump().values()):
            raise ValueError("At least one field must be provided")
        return self


class AlbumInDB(AlbumBase):
    """Schema for album data as stored in DB."""
    id: int = Field(gt=0)


class AlbumResponse(AlbumInDB):
    """Basic album response schema."""
    artists: Optional[List[dict]] = None
    collections_count: int = Field(default=0)
    loans_count: int = Field(default=0)
    wishlist_count: int = Field(default=0)


class AlbumDetailResponse(AlbumResponse):
    """Detailed album response including related lists."""
    collections: List[dict] = Field(default_factory=list)
    loans:       List[dict] = Field(default_factory=list)
    wishlist_items: List[dict] = Field(default_factory=list)
