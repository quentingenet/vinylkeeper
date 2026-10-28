from datetime import datetime
from typing import Optional
from pydantic import Field, field_validator, model_validator
from pydantic import ConfigDict

from app.schemas import BaseSchema
from app.core.enums import EntityTypeEnum, VinylStateEnum
from app.utils.discogs_release import DISCOGS_IMAGE_HOST, is_discogs_image


class AlbumStateData(BaseSchema):
    """Schema for album state data when adding to collection."""
    state_cover: Optional[VinylStateEnum] = Field(
        None,
        description="State of the cover (mint, near_mint, very_good_plus, etc.)"
    )
    state_record: Optional[VinylStateEnum] = Field(
        None,
        description="State of the record (mint, near_mint, very_good_plus, etc.)"
    )
    acquisition_month_year: Optional[str] = Field(
        None,
        description="Acquisition month and year in format YYYY-MM (e.g., '2024-06')"
    )


class ExternalReferenceBase(BaseSchema):
    """
    Base schema for external reference data.

    title and image_url come from the client: they are bounded here, and the
    Discogs enrichment of a new album replaces them with the Discogs values.
    """
    external_id: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="External ID"
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
    image_url: str = Field(
        ...,
        max_length=1024,
        description="URL of the image: empty, or an https image of the Discogs CDN"
    )
    source: str = Field(
        ...,
        max_length=50,
        description="Source of the data (e.g., 'DISCOGS')"
    )

    @field_validator("title")
    @classmethod
    def strip_title(cls, v: str) -> str:
        return v.strip()

    @field_validator("image_url")
    @classmethod
    def validate_image_url(cls, v: str) -> str:
        v = v.strip()
        if v and not is_discogs_image(v):
            raise ValueError(f"image_url must be an https URL of {DISCOGS_IMAGE_HOST}")
        return v

    def get_external_id(self) -> str:
        """Get the external ID."""
        return self.external_id


class AddToWishlistRequest(ExternalReferenceBase):
    """Request model for adding an item to wishlist."""
    pass


class AddToCollectionRequest(ExternalReferenceBase):
    """Request model for adding an item to collection."""
    album_data: Optional[AlbumStateData] = Field(
        None,
        description="Optional album state data when adding to collection"
    )
    pressing_confirmed: bool = Field(
        False,
        description="The pressing details were shown when this release was picked"
    )
    add_copy: bool = Field(
        False,
        description="When this release is already in the collection, add another copy with album_data "
                    "instead of updating the first copy"
    )


class OwnedPressingResponse(BaseSchema):
    """A pressing of the searched work already in one of the user's collections."""
    collection_id: int
    collection_name: str
    album_id: int
    external_album_id: str
    title: Optional[str] = None
    same_release: bool = Field(..., description="The very release searched for, not another pressing")
    pressing_confirmed: bool
    copies_count: int
    release_year: Optional[int] = None
    country: Optional[str] = None
    label: Optional[str] = None
    catno: Optional[str] = None
    formats: list[str] = Field(default_factory=list)


class ReplacePressingRequest(ExternalReferenceBase):
    """The release on the owner's shelf, to replace the one picked by mistake."""

    @model_validator(mode="after")
    def album_only(self) -> "ReplacePressingRequest":
        if self.entity_type != EntityTypeEnum.ALBUM:
            raise ValueError("Only an album has a pressing")
        return self


class WishlistItemResponse(BaseSchema):
    """Response model for wishlist items that matches the Wishlist model."""
    id: int = Field(..., description="Unique identifier")
    external_id: str = Field(..., description="External ID")
    title: str = Field(..., description="Title of the album or artist")
    image_url: str = Field(..., description="URL of the image")
    created_at: datetime = Field(..., description="When the wishlist item was created")
    entity_type: Optional[str] = Field(None, description="Entity type name (album or artist)")
    source: Optional[str] = Field(None, description="Source name (discogs or musicbrainz)")

    model_config = ConfigDict(from_attributes=True)


class AddToWishlistResponse(BaseSchema):
    """Response model for adding items to wishlist with status information."""
    item: WishlistItemResponse = Field(..., description="The wishlist item")
    is_new: bool = Field(..., description="Whether this is a newly added item")
    message: str = Field(..., description="User-friendly message about the operation")
    entity_type: str = Field(..., description="Type of entity (album or artist)")

    model_config = ConfigDict(from_attributes=True)


class CollectionItemResponse(BaseSchema):
    """Response model for collection items."""
    id: int = Field(..., description="Unique identifier")
    external_id: str = Field(..., description="External ID")
    entity_type: str = Field(..., description="Type of entity (ALBUM or ARTIST)")
    title: str = Field(..., description="Title of the album or artist")
    image_url: str = Field(..., description="URL of the image")
    source: str = Field(..., description="Source of the data")
    created_at: datetime = Field(..., description="When the reference was created")

    model_config = ConfigDict(from_attributes=True)


class AddToCollectionResponse(BaseSchema):
    """Response model for adding items to collection with status information."""
    item: CollectionItemResponse = Field(..., description="The collection item")
    is_new: bool = Field(..., description="Whether this is a newly added item")
    message: str = Field(..., description="User-friendly message about the operation")
    entity_type: str = Field(..., description="Type of entity (album or artist)")
    collection_name: str = Field(..., description="Name of the collection")

    model_config = ConfigDict(from_attributes=True)
