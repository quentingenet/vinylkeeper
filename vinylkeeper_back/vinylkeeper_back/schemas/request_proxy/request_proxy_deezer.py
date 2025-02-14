from pydantic import BaseModel, Field
from typing import Optional
from uuid import uuid4

class SearchQuery(BaseModel):
    query: str
    is_artist: bool

class Artist(BaseModel):
    uuid: str = Field(default_factory=lambda: str(uuid4()))
    id: int
    name: Optional[str]
    link: Optional[str]
    picture: Optional[str]
    picture_small: Optional[str]
    picture_medium: Optional[str]
    picture_big: Optional[str]
    picture_xl: Optional[str]
    tracklist: Optional[str]
    type: Optional[str]

class DeezerData(BaseModel):
    uuid: str = Field(default_factory=lambda: str(uuid4()))
    id: int
    name: Optional[str] = None
    title: Optional[str] = None
    link: Optional[str]
    picture: Optional[str]
    picture_small: Optional[str]
    picture_medium: Optional[str]
    picture_big: Optional[str]
    picture_xl: Optional[str]
    nb_album: Optional[int] = None
    nb_fan: Optional[int] = None
    radio: Optional[bool] = None
    tracklist: Optional[str]
    md5_image: Optional[str] = None
    genre_id: Optional[int] = None
    nb_tracks: Optional[int] = None
    record_type: Optional[str] = None
    explicit_lyrics: Optional[bool] = None
    artist: Optional[Artist] = None
    type: Optional[str]

