from datetime import datetime
from typing import Optional, List

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator
)


class CollectionBase(BaseModel):
    """Base schema for collection data."""
    name: str = Field(
        min_length=1,
        max_length=255,
        description="Collection name must be between 1 and 255 characters"
    )
    description: Optional[str] = Field(
        None,
        max_length=255,
        description="Optional description, maximum 255 characters"
    )
    is_public: bool = Field(
        default=False,
        description="Whether the collection is visible to other users"
    )
    owner_id: int = Field(
        gt=0,
        description="ID of the collection owner"
    )

    model_config = ConfigDict(from_attributes=True)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Validate collection name."""
        if not v or len(v.strip()) == 0:
            raise ValueError("Collection name cannot be empty")
        return v.strip()

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: Optional[str]) -> Optional[str]:
        """Validate collection description."""
        if v is not None and len(v) > 255:
            raise ValueError("Description cannot be longer than 255 characters")
        return v


class CollectionCreate(CollectionBase):
    """Schema for creating a new collection."""
    album_ids: Optional[List[int]] = Field(
        default_factory=list,
        description="List of album IDs to include in the collection"
    )
    artist_ids: Optional[List[int]] = Field(
        default_factory=list,
        description="List of artist IDs to include in the collection"
    )

    @model_validator(mode='after')
    def validate_content(self) -> 'CollectionCreate':
        """Validate that the collection has at least one album or artist."""
        if not self.album_ids and not self.artist_ids:
            raise ValueError("Collection must contain at least one album or artist")
        return self


class CollectionUpdate(BaseModel):
    """Schema for updating a collection."""
    name: Optional[str] = Field(
        None,
        min_length=1,
        max_length=255
    )
    description: Optional[str] = Field(
        None,
        max_length=255
    )
    is_public: Optional[bool] = None
    album_ids: Optional[List[int]] = None
    artist_ids: Optional[List[int]] = None

    model_config = ConfigDict(extra="forbid")

    @model_validator(mode='after')
    def validate_fields(self) -> 'CollectionUpdate':
        """Validate that at least one field is provided for update."""
        if not any(v is not None for v in self.model_dump().values()):
            raise ValueError("At least one field must be provided for update")
        return self


class CollectionInDB(CollectionBase):
    """Schema for collection data as stored in database."""
    id: int = Field(gt=0)
    registered_at: datetime
    updated_at: datetime


class CollectionResponse(CollectionInDB):
    """Schema for collection data in API responses."""
    owner: Optional[dict] = None  # Will be populated with user data
    albums: List[dict] = Field(default_factory=list)  # Will be populated with album data
    artists: List[dict] = Field(default_factory=list)  # Will be populated with artist data
    likes_count: int = Field(default=0)
    is_liked_by_user: bool = Field(default=False)


class CollectionDetailResponse(CollectionResponse):
    """Detailed collection response including all related data."""
    liked_by: List[dict] = Field(default_factory=list)  # Will be populated with user data 