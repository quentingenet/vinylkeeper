from datetime import datetime
from typing import Optional, List

from pydantic import Field, field_validator, model_validator

from app.schemas import BaseSchema


class WishlistBase(BaseSchema):
    """Base schema for wishlist data."""
    external_id: str = Field(
        ...,
        max_length=255,
        description="External ID as string"
    )
    entity_type_id: int = Field(
        gt=0,
        description="ID of the entity type"
    )
    external_source_id: int = Field(
        gt=0,
        description="ID of the external source"
    )
    title: Optional[str] = Field(
        None,
        max_length=512,
        description="Title of the album or artist"
    )
    image_url: Optional[str] = Field(
        None,
        max_length=1024,
        description="URL of the image"
    )

    @field_validator("external_id")
    @classmethod
    def validate_external_id(cls, v: str) -> str:
        """Validate external ID format."""
        if not v.isdigit():
            raise ValueError("External ID must be numeric")
        return v


class WishlistCreateFromFront(BaseSchema):
    """Schema for creating a wishlist item from frontend."""
    external_album_id: Optional[str] = Field(
        None,
        max_length=255,
        description="External Album ID"
    )
    external_artist_id: Optional[str] = Field(
        None,
        max_length=255,
        description="External Artist ID"
    )
    entity_type_id: int = Field(
        gt=0,
        description="ID of the entity type"
    )
    title: str = Field(
        ...,
        max_length=512,
        description="Title of the album or artist"
    )
    picture: str = Field(
        ...,
        max_length=1024,
        description="URL of the image"
    )
    external_source_id: int = Field(
        gt=0,
        description="ID of the external source"
    )

    @model_validator(mode='after')
    def validate_ids(self) -> 'WishlistCreateFromFront':
        """Validate that the correct ID is provided based on entity_type."""
        if self.entity_type_id == 1 and not self.external_album_id:
            raise ValueError(
                "external_album_id is required for ALBUM entity type")
        if self.entity_type_id == 2 and not self.external_artist_id:
            raise ValueError(
                "external_artist_id is required for ARTIST entity type")
        return self

    def to_wishlist_create(self) -> 'WishlistCreate':
        """Convert to WishlistCreate format."""
        external_id = self.external_album_id if self.entity_type_id == 1 else self.external_artist_id
        return WishlistCreate(
            external_id=external_id,
            external_source_id=self.external_source_id,
            entity_type_id=self.entity_type_id,
            title=self.title,
            image_url=self.picture
        )


class WishlistCreate(WishlistBase):
    """Schema for creating a new wishlist item."""
    pass


class WishlistUpdate(BaseSchema):
    """Schema for updating a wishlist item."""
    title: Optional[str] = Field(
        None,
        max_length=512
    )
    image_url: Optional[str] = Field(
        None,
        max_length=1024
    )

    @model_validator(mode='after')
    def validate_fields(self) -> 'WishlistUpdate':
        """Validate that at least one field is provided for update."""
        if not any(v is not None for v in self.model_dump().values()):
            raise ValueError("At least one field must be provided for update")
        return self


class WishlistInDB(WishlistBase):
    """Schema for wishlist data as stored in database."""
    id: int = Field(
        gt=0,
        description="Unique identifier for the wishlist item"
    )
    user_id: int = Field(
        gt=0,
        description="ID of the wishlist owner"
    )
    created_at: datetime = Field(
        description="When the wishlist item was created"
    )


class WishlistResponse(WishlistInDB):
    """Schema for wishlist data in API responses."""
    entity_type: Optional[dict] = Field(
        None,
        description="Entity type data"
    )
    external_source: Optional[dict] = Field(
        None,
        description="External source data"
    )


class WishlistDetailResponse(WishlistResponse):
    """Detailed wishlist response including all related data."""
    user: Optional[dict] = Field(
        None,
        description="User who owns this wishlist item"
    )


class WishlistItemListResponse(BaseSchema):
    """Lightweight schema for wishlist list view (optimized for performance)."""
    id: int = Field(gt=0, description="Unique identifier")
    entity_type: str = Field(...,
                             description="Entity type name (album or artist)")
    external_id: str = Field(..., description="External ID")
    title: str = Field(..., description="Title of the album or artist")
    image_url: Optional[str] = Field(None, description="URL of the image")
    created_at: datetime = Field(...,
                                 description="When the wishlist item was created")


class PaginatedWishlistResponse(BaseSchema):
    """Schema for paginated wishlist response."""
    items: List[WishlistItemListResponse] = Field(default_factory=list)
    total: int = Field(ge=0, description="Total number of wishlist items")
    page: int = Field(gt=0, description="Current page number")
    limit: int = Field(gt=0, description="Number of items per page")
    total_pages: int = Field(ge=0, description="Total number of pages")
