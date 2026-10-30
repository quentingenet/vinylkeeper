from datetime import datetime
from typing import Optional, List

from pydantic import Field, model_validator

from app.schemas import BaseSchema


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


class WishlistPressingResponse(BaseSchema):
    """One wanted pressing of a work: one wishlist row, with the pressing details of its album."""
    id: int = Field(gt=0, description="Wishlist row id (to remove it, or move it to a collection)")
    external_id: str
    title: str
    image_url: Optional[str] = None
    created_at: datetime
    release_year: Optional[int] = None
    country: Optional[str] = None
    label: Optional[str] = None
    catno: Optional[str] = None
    formats: List[str] = Field(default_factory=list)


class WishlistItemListResponse(BaseSchema):
    """
    A card of the wishlist: a work (the pressings of one Discogs master), or an artist.
    id, title and image_url are the ones of its first wanted pressing.
    """
    id: int = Field(gt=0, description="Unique identifier")
    entity_type: str = Field(...,
                             description="Entity type name (album or artist)")
    external_id: str = Field(..., description="External ID")
    title: str = Field(..., description="Title of the album or artist")
    image_url: Optional[str] = Field(None, description="URL of the image")
    created_at: datetime = Field(...,
                                 description="When the wishlist item was created")
    pressings_count: int = Field(1, ge=1, description="Wanted pressings of the work (x2, x3 on the cover)")
    pressings: List[WishlistPressingResponse] = Field(
        default_factory=list, description="The wanted pressings of an album work, first added first")


class PaginatedWishlistResponse(BaseSchema):
    """Schema for paginated wishlist response."""
    items: List[WishlistItemListResponse] = Field(default_factory=list)
    total: int = Field(ge=0, description="Total number of wishlist cards (works and artists)")
    page: int = Field(gt=0, description="Current page number")
    limit: int = Field(gt=0, description="Number of items per page")
    total_pages: int = Field(ge=0, description="Total number of pages")
