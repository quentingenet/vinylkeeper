from datetime import datetime
from typing import Optional
from pydantic import Field, field_validator
from pydantic import ConfigDict

from app.schemas import BaseSchema
from app.core.enums import EntityTypeEnum


class EntityTypeResponse(BaseSchema):
    """Schema for entity type data in responses."""
    id: int = Field(gt=0, description="Entity type ID")
    name: str = Field(description="Entity type name")

    model_config = ConfigDict(from_attributes=True)


class ExternalSourceResponse(BaseSchema):
    """Schema for external source data in responses."""
    id: int = Field(gt=0, description="External source ID")
    name: str = Field(description="External source name")

    model_config = ConfigDict(from_attributes=True)


class AlbumStateData(BaseSchema):
    """Schema for album state data when adding to collection."""
    state_cover: Optional[str] = Field(
        None, 
        description="Name of the cover state (e.g., 'near_mint')"
    )
    state_record: Optional[str] = Field(
        None, 
        description="Name of the record state (e.g., 'near_mint')"
    )
    acquisition_month_year: Optional[str] = Field(
        None, 
        description="Acquisition month and year in format YYYY-MM (e.g., '2024-06')"
    )


class ExternalReferenceBase(BaseSchema):
    """Base schema for external reference data."""
    external_id: str = Field(
        ...,
        description="External ID"
    )
    entity_type: EntityTypeEnum = Field(
        ...,
        description="Type of entity (ALBUM or ARTIST)"
    )
    title: str = Field(
        ...,
        description="Title of the album or artist"
    )
    image_url: str = Field(
        ...,
        description="URL of the image"
    )
    source: str = Field(
        ...,
        description="Source of the data (e.g., 'DISCOGS')"
    )

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


class ExternalReferenceResponse(BaseSchema):
    """Response model for external reference operations."""
    success: bool = Field(..., description="Whether the operation was successful")
    message: str = Field(..., description="Response message")
    data: Optional[dict] = Field(
        None,
        description="Additional data if available"
    )


class SearchResult(BaseSchema):
    """Schema for search result items."""
    external_id: str = Field(..., description="External ID of the item")
    title: str = Field(..., description="Title of the album or artist")
    image_url: str = Field(..., description="URL of the image")
    entity_type: str = Field(..., description="Type of entity (ALBUM or ARTIST)")
    source: str = Field(..., description="Source of the data")


class SearchResponse(BaseSchema):
    """Schema for search response."""
    results: list[SearchResult] = Field(..., description="List of search results")
    total: int = Field(..., description="Total number of results")
    page: int = Field(..., description="Current page number")
    limit: int = Field(..., description="Number of items per page")
    total_pages: int = Field(..., description="Total number of pages")


class WishlistItemResponse(BaseSchema):
    """Response model for wishlist items that matches the Wishlist model."""
    id: int = Field(..., description="Unique identifier")
    user_id: int = Field(..., description="ID of the user who owns this wishlist item")
    external_id: str = Field(..., description="External ID")
    entity_type_id: int = Field(..., description="ID of the entity type")
    external_source_id: int = Field(..., description="ID of the external source")
    title: str = Field(..., description="Title of the album or artist")
    image_url: str = Field(..., description="URL of the image")
    created_at: datetime = Field(..., description="When the wishlist item was created")
    
    # Additional fields for display - using simple strings for frontend compatibility
    entity_type: Optional[str] = Field(None, description="Entity type name (album or artist)")
    source: Optional[str] = Field(None, description="Source name (discogs or musicbrainz)")

    model_config = ConfigDict(from_attributes=True)


class CollectionItemResponse(BaseSchema):
    """Response model for collection items."""
    id: int = Field(..., description="Unique identifier")
    user_id: int = Field(..., description="ID of the user who owns this reference")
    external_id: str = Field(..., description="External ID")
    entity_type: str = Field(..., description="Type of entity (ALBUM or ARTIST)")
    title: str = Field(..., description="Title of the album or artist")
    image_url: str = Field(..., description="URL of the image")
    source: str = Field(..., description="Source of the data")
    created_at: datetime = Field(..., description="When the reference was created")

    model_config = ConfigDict(from_attributes=True)


class AddExternalResponse(BaseSchema):
    """Response model for adding external reference."""
    success: bool = Field(..., description="Whether the operation was successful")
    message: str = Field(..., description="Response message")
