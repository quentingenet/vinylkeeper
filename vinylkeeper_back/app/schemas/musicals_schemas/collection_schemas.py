from pydantic import BaseModel
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

    class Config:
        from_attributes = True
