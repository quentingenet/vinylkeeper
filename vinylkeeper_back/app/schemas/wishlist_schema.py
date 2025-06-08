from datetime import datetime
from typing import Optional, List

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator
)

from app.core.enums import EntityTypeEnum, ExternalSourceEnum


class WishlistBase(BaseModel):
    """Base schema for wishlist data."""
    external_id: str = Field(
        ...,
        pattern=r"^\d+$",
        description="External ID (numeric string)"
    )
    source: ExternalSourceEnum = Field(
        ...,
        description="Source of the data (e.g., 'discogs')"
    )
    entity_type: EntityTypeEnum = Field(
        ...,
        description="Type of entity (ALBUM or ARTIST)"
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

    model_config = ConfigDict(from_attributes=True)

    @field_validator("external_id")
    @classmethod
    def validate_external_id(cls, v: str) -> str:
        """Validate external ID format."""
        if not v.isdigit():
            raise ValueError("External ID must be numeric")
        return v


class WishlistCreateFromFront(BaseModel):
    """Schema for creating a wishlist item from frontend."""
    external_album_id: Optional[str] = Field(
        None,
        pattern=r"^\d*$",
        description="External Album ID (numeric string)"
    )
    external_artist_id: Optional[str] = Field(
        None,
        pattern=r"^\d*$",
        description="External Artist ID (numeric string)"
    )
    entity_type: EntityTypeEnum = Field(
        ...,
        description="Type of entity (ALBUM or ARTIST)"
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
    source: ExternalSourceEnum = Field(
        ...,
        description="Source of the data (e.g., 'discogs')"
    )

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode='after')
    def validate_ids(self) -> 'WishlistCreateFromFront':
        """Validate that the correct ID is provided based on entity_type."""
        if self.entity_type == EntityTypeEnum.ALBUM and not self.external_album_id:
            raise ValueError(
                "external_album_id is required for ALBUM entity type")
        if self.entity_type == EntityTypeEnum.ARTIST and not self.external_artist_id:
            raise ValueError(
                "external_artist_id is required for ARTIST entity type")
        return self

    def to_wishlist_create(self) -> 'WishlistCreate':
        """Convert to WishlistCreate format."""
        external_id = self.external_album_id if self.entity_type == EntityTypeEnum.ALBUM else self.external_artist_id
        return WishlistCreate(
            external_id=external_id,
            source=self.source,
            entity_type=self.entity_type,
            title=self.title,
            image_url=self.picture
        )


class WishlistCreate(WishlistBase):
    """Schema for creating a new wishlist item."""
    pass


class WishlistUpdate(BaseModel):
    """Schema for updating a wishlist item."""
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

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    @model_validator(mode='after')
    def validate_fields(self) -> 'WishlistUpdate':
        """Validate that at least one field is provided for update."""
        if not any(v is not None for v in self.model_dump().values()):
            raise ValueError("At least one field must be provided for update")
        return self


class WishlistInDB(WishlistBase):
    """Schema for wishlist data as stored in database."""
    id: int = Field(gt=0)
    user_id: int = Field(gt=0, description="ID of the wishlist owner")
    created_at: datetime


class WishlistResponse(WishlistInDB):
    """Schema for wishlist data in API responses."""
    album: Optional[dict] = None
    artist: Optional[dict] = None


class WishlistDetailResponse(WishlistResponse):
    """Detailed wishlist response including all related data."""
    user: Optional[dict] = Field(
        None, description="User who owns this wishlist item")
