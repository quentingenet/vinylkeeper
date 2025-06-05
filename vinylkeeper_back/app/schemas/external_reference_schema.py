from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict, field_validator
from app.core.enums import EntityTypeEnum


class ExternalReferenceBase(BaseModel):
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

    model_config = ConfigDict(from_attributes=True)

    @field_validator('source')
    def source_must_be_uppercase(cls, v):
        """Ensure source is always uppercase."""
        return v.upper()

    def get_external_id(self) -> str:
        """Get the external ID."""
        return self.external_id


class AddToWishlistRequest(ExternalReferenceBase):
    """Request model for adding an item to wishlist."""
    pass


class AddToCollectionRequest(ExternalReferenceBase):
    """Request model for adding an item to collection."""
    pass


class AddExternalResponse(BaseModel):
    """Response model for adding/removing external references."""
    success: bool = Field(
        ...,
        description="Whether the operation was successful"
    )
    message: str = Field(
        ...,
        description="Response message"
    )

    model_config = ConfigDict(from_attributes=True)


class ExternalReferenceResponse(ExternalReferenceBase):
    """Base response model for external references."""
    id: int = Field(
        ...,
        description="Unique identifier"
    )
    user_id: int = Field(
        ...,
        description="ID of the user who owns this reference"
    )
    created_at: datetime = Field(
        ...,
        description="When the reference was created"
    )


class WishlistItemResponse(BaseModel):
    """Response model for wishlist items that matches the Wishlist model."""
    id: int = Field(..., description="Unique identifier")
    user_id: int = Field(..., description="ID of the user who owns this wishlist item")
    external_id: str = Field(..., description="External ID")
    entity_type_id: int = Field(..., description="ID of the entity type")
    external_source_id: int = Field(..., description="ID of the external source")
    title: str = Field(..., description="Title of the album or artist")
    image_url: str = Field(..., description="URL of the image")
    created_at: datetime = Field(..., description="When the wishlist item was created")
    
    # Additional fields for display
    entity_type: str = Field(..., description="Entity type name (ALBUM or ARTIST)")
    source: str = Field(..., description="Source name (DISCOGS, etc.)")

    model_config = ConfigDict(from_attributes=True)


class CollectionItemResponse(BaseModel):
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
