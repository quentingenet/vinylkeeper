from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from api.models.external_reference_model import ExternalSourceEnum, ExternalItemTypeEnum


class ExternalReferenceBase(BaseModel):
    external_id: str
    external_source: ExternalSourceEnum
    item_type: ExternalItemTypeEnum
    title: Optional[str] = None
    artist_name: Optional[str] = None
    picture_small: Optional[str] = None
    picture_medium: Optional[str] = None
    picture_big: Optional[str] = None


class ExternalReferenceCreate(ExternalReferenceBase):
    pass


class ExternalReference(ExternalReferenceBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class AddToWishlistRequest(BaseModel):
    external_id: str
    title: str
    artist_name: Optional[str] = None
    picture_medium: Optional[str] = None


class AddToCollectionRequest(BaseModel):
    external_id: str
    item_type: ExternalItemTypeEnum
    title: str
    artist_name: Optional[str] = None
    picture_medium: Optional[str] = None


class AddExternalResponse(BaseModel):
    success: bool
    message: str 