from datetime import datetime
from typing import Optional, List

from pydantic import Field, field_validator, model_validator

from app.schemas import BaseSchema
from app.schemas.user_schema import UserMiniResponse
from app.schemas.album_schema import AlbumBase
from app.schemas.artist_schema import ArtistBase
from app.schemas.external_reference_schema import WishlistItemResponse
from app.core.enums import MoodEnum, VinylStateEnum


# Import AlbumInCollection from album_schema to avoid duplication
from app.schemas.album_schema import AlbumInCollection


class CollectionAlbumResponse(AlbumBase, AlbumInCollection):
    """Schema for album data in collection responses."""
    id: int = Field(gt=0)
    created_at: datetime
    updated_at: datetime
    collections_count: int = Field(default=0)
    loans_count: int = Field(default=0)
    wishlist_count: int = Field(default=0)


class CollectionArtistResponse(BaseSchema):
    """Schema for artist data in collection responses."""
    id: int = Field(gt=0)
    external_artist_id: str = Field(..., description="External Artist ID")
    title: str = Field(..., description="Artist title")
    image_url: Optional[str] = Field(None, description="Artist image URL")
    external_source: dict = Field(...,
                                  description="External source information")
    created_at: datetime
    updated_at: datetime
    collections_count: int = Field(default=0)


class CollectionBase(BaseSchema):
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
    mood_id: Optional[int] = Field(
        None,
        gt=0,
        description="Optional ID of the mood"
    )

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
            raise ValueError(
                "Description cannot be longer than 255 characters")
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
    albums: Optional[List[int]] = Field(
        default_factory=list,
        description="List of album IDs to include in the collection"
    )

    @field_validator("album_ids")
    @classmethod
    def validate_album_ids(cls, v: Optional[List[int]]) -> Optional[List[int]]:
        """Validate album IDs."""
        if v is not None:
            if not all(id > 0 for id in v):
                raise ValueError("All album IDs must be positive integers")
        return v

    @field_validator("artist_ids")
    @classmethod
    def validate_artist_ids(cls, v: Optional[List[int]]) -> Optional[List[int]]:
        """Validate artist IDs."""
        if v is not None:
            if not all(id > 0 for id in v):
                raise ValueError("All artist IDs must be positive integers")
        return v


class CollectionUpdate(BaseSchema):
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
    mood_id: Optional[int] = Field(
        None,
        gt=0,
        description="ID of the mood"
    )

    @model_validator(mode='after')
    def validate_fields(self) -> 'CollectionUpdate':
        """Validate that at least one field is provided for update."""
        if not any(v is not None for v in self.model_dump().values()):
            raise ValueError("At least one field must be provided for update")
        return self


class CollectionVisibilityUpdate(BaseSchema):
    """Schema for updating collection visibility."""
    is_public: bool


class CollectionInDB(CollectionBase):
    """Schema for collection data as stored in database."""
    id: int = Field(gt=0)
    owner_id: int = Field(
        gt=0,
        description="ID of the collection owner"
    )
    created_at: datetime
    updated_at: datetime


class CollectionResponse(CollectionInDB):
    """Schema for collection data in API responses."""
    owner: Optional[UserMiniResponse] = None
    albums: List[CollectionAlbumResponse] = Field(default_factory=list)
    artists: List[CollectionArtistResponse] = Field(default_factory=list)
    likes_count: int = Field(default=0)
    is_liked_by_user: bool = Field(default=False)
    wishlist: List[WishlistItemResponse] = Field(default_factory=list)


class CollectionListItemResponse(BaseSchema):
    """Lightweight schema for collection list views (optimized for performance)."""
    id: int = Field(gt=0)
    name: str
    description: Optional[str] = Field(
        None, description="Truncated description for list view")
    is_public: bool
    owner_id: int = Field(gt=0)
    owner: Optional[UserMiniResponse] = None
    likes_count: int = Field(default=0)
    is_liked_by_user: bool = Field(default=False)
    albums_count: int = Field(
        default=0, description="Number of albums in collection")
    artists_count: int = Field(
        default=0, description="Number of artists in collection")
    created_at: datetime
    updated_at: datetime
    image_preview: Optional[str] = Field(
        None, description="First album image URL if available")


class CollectionDetailResponse(CollectionResponse):
    """Detailed collection response including all related data."""
    liked_by: List[UserMiniResponse] = Field(default_factory=list)


class PaginatedAlbumsResponse(BaseSchema):
    """Schema for paginated albums response."""
    items: List[CollectionAlbumResponse] = Field(default_factory=list)
    total: int = Field(ge=0, description="Total number of albums")
    page: int = Field(gt=0, description="Current page number")
    limit: int = Field(gt=0, description="Number of items per page")
    total_pages: int = Field(ge=0, description="Total number of pages")


class PaginatedArtistsResponse(BaseSchema):
    """Schema for paginated artists response."""
    items: List[CollectionArtistResponse] = Field(default_factory=list)
    total: int = Field(ge=0, description="Total number of artists")
    page: int = Field(gt=0, description="Current page number")
    limit: int = Field(gt=0, description="Number of items per page")
    total_pages: int = Field(ge=0, description="Total number of pages")


class CollectionSearchResponse(BaseSchema):
    """Schema for collection search response."""
    albums: List[CollectionAlbumResponse] = Field(default_factory=list)
    artists: List[CollectionArtistResponse] = Field(default_factory=list)
    query: str = Field(..., description="Search query used")
    search_type: str = Field(..., description="Type of search performed")


class PaginatedCollectionResponse(BaseSchema):
    """Schema for paginated collections response."""
    items: List[CollectionResponse] = Field(default_factory=list)
    total: int = Field(ge=0, description="Total number of collections")
    page: int = Field(gt=0, description="Current page number")
    limit: int = Field(gt=0, description="Number of items per page")
    total_pages: int = Field(ge=0, description="Total number of pages")


class PaginatedCollectionListResponse(BaseSchema):
    """Schema for paginated collection list response (optimized for performance)."""
    items: List[CollectionListItemResponse] = Field(default_factory=list)
    total: int = Field(ge=0, description="Total number of collections")
    page: int = Field(gt=0, description="Current page number")
    limit: int = Field(gt=0, description="Number of items per page")
    total_pages: int = Field(ge=0, description="Total number of pages")
