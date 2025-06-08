from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, validator
from app.core.enums import EntityTypeEnum


class AddToWishlistRequest(BaseModel):
    """Request model for adding an item to wishlist"""
    external_id: str = Field(..., description="External ID")
    entity_type: EntityTypeEnum = Field(
        ..., description="Type of entity (ALBUM or ARTIST)")
    title: str = Field(..., description="Title of the album or artist")
    image_url: str = Field(..., description="URL of the image")
    source: str = Field(...,
                        description="Source of the data (e.g., 'DISCOGS')")

    @validator('source')
    def source_must_be_uppercase(cls, v):
        return v.upper()

    def get_external_id(self) -> str:
        """Get the external ID"""
        return self.external_id


class AddToCollectionRequest(BaseModel):
    """Request model for adding an item to collection"""
    external_id: str = Field(..., description="External ID")
    entity_type: EntityTypeEnum = Field(
        ..., description="Type of entity (ALBUM or ARTIST)")
    title: str = Field(..., description="Title of the album or artist")
    image_url: str = Field(..., description="URL of the image")
    source: str = Field(...,
                        description="Source of the data (e.g., 'DISCOGS')")

    @validator('source')
    def source_must_be_uppercase(cls, v):
        return v.upper()

    def get_external_id(self) -> str:
        """Get the external ID"""
        return self.external_id


class AddExternalResponse(BaseModel):
    """Response model for adding/removing external references"""
    success: bool = Field(...,
                          description="Whether the operation was successful")
    message: str = Field(..., description="Response message")


class WishlistItemResponse(BaseModel):
    """Response model for wishlist items"""
    id: int
    user_id: int
    external_id: str
    entity_type: EntityTypeEnum
    title: str
    image_url: str
    source: str
    created_at: datetime

    @validator('source')
    def source_must_be_uppercase(cls, v):
        return v.upper()


class CollectionItemResponse(BaseModel):
    """Response model for collection items"""
    id: int
    user_id: int
    external_id: str
    entity_type: EntityTypeEnum
    title: str
    image_url: str
    source: str
    created_at: datetime

    @validator('source')
    def source_must_be_uppercase(cls, v):
        return v.upper()
