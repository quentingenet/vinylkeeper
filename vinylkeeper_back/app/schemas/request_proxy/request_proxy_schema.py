from pydantic import BaseModel
from typing import List, Optional
from pydantic import BaseModel, Field
from typing import Optional, List
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


class ArtistMetadata(BaseModel):
    name: str = Field(..., description="Artist name")
    biography: Optional[str] = Field(None, description="Artist biography")
    image: Optional[str] = Field(None, description="Artist image URL")
    genres: Optional[List[str]] = Field(
        default_factory=list, description="List of music genres")
    country: Optional[str] = Field(None, description="Country of origin")
    wikipedia_url: Optional[str] = Field(
        None, description="Wikipedia page URL")
    discogs_id: Optional[str] = Field(None, description="Discogs artist ID")
    discogs_url: Optional[str] = Field(
        None, description="Discogs artist page URL")
    members: Optional[List[str]] = Field(
        default_factory=list, description="Band members")
    active_years: Optional[str] = Field(None, description="Years active")
    aliases: Optional[List[str]] = Field(
        default_factory=list, description="Alternative names or aliases")


class Track(BaseModel):
    position: str
    title: str
    duration: str


class AlbumMetadata(BaseModel):
    id: int
    title: str
    artist: str
    picture: Optional[str] = None
    release_year: Optional[int] = None
    genres: List[str] = Field(default_factory=list)
    styles: List[str] = Field(default_factory=list)
    tracklist: List[Track] = Field(default_factory=list)
