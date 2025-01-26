from datetime import datetime

from pydantic import BaseModel, Field
from typing import List
from app.schemas.musicals_schemas.album_schemas import Album


class CollectionBase(BaseModel):
    name: str

    class Config:
        from_attributes = True


class CollectionCreate(CollectionBase):
    pass


class CollectionUpdate(CollectionBase):
    pass


class Collection(CollectionBase):
    id: int
    user_id: int
    albums: List[Album] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    class Config:
        from_attributes = True
