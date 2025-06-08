from pydantic import BaseModel
from typing import List, Optional
from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import uuid4


class SearchQuery(BaseModel):
    """Schema for search query."""
    query: str = Field(..., description="Search query")
    is_artist: bool = Field(
        False, description="Whether to search for artists instead of albums")


class ExternalData(BaseModel):
    """Schema for external data."""
    id: str  # Changed from int to str for external IDs
    title: str
    artist: str
    year: Optional[str] = None
    image_url: Optional[str] = None
    source: str = Field(...,
                        description="Source of the data (e.g., 'DISCOGS')")


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


class AlbumMetadata(BaseModel):
    """Schema for album metadata."""
    id: str
    title: str
    artist: str
    year: Optional[str] = None
    image_url: Optional[str] = None
    genres: List[str] = Field(default_factory=list)
    styles: List[str] = Field(default_factory=list)
    tracklist: List[dict] = Field(default_factory=list)
    source: str = Field(...,
                        description="Source of the data (e.g., 'DISCOGS')")


class ArtistMetadata(BaseModel):
    """Schema for artist metadata."""
    id: str
    name: str
    image_url: Optional[str] = None
    biography: Optional[str] = None
    genres: List[str] = Field(default_factory=list)
    country: Optional[str] = None
    wikipedia_url: Optional[str] = None
    external_id: Optional[str] = Field(None, description="External artist ID")
    external_url: Optional[str] = Field(
        None, description="External artist page URL")
    members: List[str] = Field(default_factory=list)
    active_years: Optional[str] = None
    aliases: List[str] = Field(default_factory=list)
    source: str = Field(...,
                        description="Source of the data (e.g., 'DISCOGS')")


class Track(BaseModel):
    position: str
    title: str
    duration: str
