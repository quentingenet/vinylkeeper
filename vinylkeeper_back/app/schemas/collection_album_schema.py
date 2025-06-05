from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, ConfigDict, model_validator


class CollectionAlbumCreate(BaseModel):
    """Schema for adding an album to a collection with metadata."""
    album_id: int = Field(..., gt=0, description="ID of the album")
    collection_id: int = Field(..., gt=0, description="ID of the collection")
    state_record: Optional[int] = Field(
        None, description="ID of the vinyl record condition")
    state_cover: Optional[int] = Field(
        None, description="ID of the album cover condition")
    acquisition_date: Optional[datetime] = Field(
        None, description="Date the album was acquired")
    purchase_price: Optional[int] = Field(
        None, description="Price paid (in cents)")

    model_config = ConfigDict(from_attributes=True)


class CollectionAlbumUpdate(BaseModel):
    """Schema for updating album metadata in a collection."""
    state_record: Optional[int] = Field(
        None, description="Updated vinyl condition ID")
    state_cover: Optional[int] = Field(
        None, description="Updated cover condition ID")
    acquisition_date: Optional[datetime] = Field(
        None, description="Updated acquisition date")
    purchase_price: Optional[int] = Field(
        None, description="Updated purchase price in cents")

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def at_least_one_field_provided(self) -> 'CollectionAlbumUpdate':
        """Ensure at least one field is provided for partial update."""
        if not any(v is not None for v in self.model_dump().values()):
            raise ValueError("At least one field must be provided for update")
        return self


class CollectionAlbumMetadataResponse(BaseModel):
    """Schema for returning collection-album metadata."""
    collection_id: int = Field(..., gt=0)
    album_id: int = Field(..., gt=0)
    state_record: Optional[int] = None
    state_cover: Optional[int] = None
    acquisition_date: Optional[datetime] = None
    purchase_price: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)
