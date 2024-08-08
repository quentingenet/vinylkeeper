import datetime
from pydantic import BaseModel


class AlbumBase(BaseModel):
    title: str
    artist_id: int
    genre_id: int
    release_date: datetime.datetime


class AlbumCreate(AlbumBase):
    collection_id: int


class Album(AlbumBase):
    id: int

    class Config:
        from_attributes = True
