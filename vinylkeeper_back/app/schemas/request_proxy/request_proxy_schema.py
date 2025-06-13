from pydantic import BaseModel, Field
from typing import Optional
from uuid import uuid4


class SearchQuery(BaseModel):
    query: str
    is_artist: bool


class Artist(BaseModel):
    uuid: str = Field(default_factory=lambda: str(uuid4()))
    id: str  # Changed from int to str for MusicBrainz IDs
    name: Optional[str] = None
    link: Optional[str] = None
    picture: Optional[str] = None
    picture_small: Optional[str] = None
    picture_medium: Optional[str] = None
    picture_big: Optional[str] = None
    picture_xl: Optional[str] = None
    tracklist: Optional[str] = None
    type: Optional[str] = None


class DiscogsData(BaseModel):
    uuid: str = Field(default_factory=lambda: str(uuid4()))
    id: str  # Changed from int to str for Discogs IDs
    name: Optional[str] = None
    title: Optional[str] = None
    link: Optional[str] = None
    picture: Optional[str] = None
    picture_small: Optional[str] = None
    picture_medium: Optional[str] = None
    picture_big: Optional[str] = None
    picture_xl: Optional[str] = None
    nb_album: Optional[int] = None
    nb_fan: Optional[int] = None
    radio: Optional[bool] = None
    tracklist: Optional[str] = None
    md5_image: Optional[str] = None
    genre_id: Optional[int] = None
    nb_tracks: Optional[int] = None
    record_type: Optional[str] = None
    explicit_lyrics: Optional[bool] = None
    artist: Optional[Artist] = None
    type: Optional[str] = None
