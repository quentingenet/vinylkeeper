from typing import List, Optional
from uuid import uuid4
from pydantic import BaseModel, Field, ConfigDict


class SearchQuery(BaseModel):
    """Schema for search query."""
    query: str = Field(
        ...,
        description="Search query string"
    )
    is_artist: bool = Field(
        False,
        description="Whether to search for artists instead of albums"
    )

    model_config = ConfigDict(from_attributes=True)


class ExternalData(BaseModel):
    """Schema for external data."""
    id: str = Field(
        ...,
        description="External ID as string"
    )
    title: str = Field(
        ...,
        description="Title of the album or artist"
    )
    artist: str = Field(
        ...,
        description="Artist name"
    )
    year: Optional[str] = Field(
        None,
        description="Release year"
    )
    image_url: Optional[str] = Field(
        None,
        description="URL of the image"
    )
    source: str = Field(
        ...,
        description="Source of the data (e.g., 'DISCOGS')"
    )

    model_config = ConfigDict(from_attributes=True)


class Artist(BaseModel):
    """Schema for artist data from external source."""
    uuid: str = Field(
        default_factory=lambda: str(uuid4()),
        description="Unique identifier for this artist data"
    )
    id: str = Field(
        ...,
        description="External artist ID"
    )
    name: Optional[str] = Field(
        None,
        description="Artist name"
    )
    link: Optional[str] = Field(
        None,
        description="Link to artist page"
    )
    picture: Optional[str] = Field(
        None,
        description="Main picture URL"
    )
    picture_small: Optional[str] = Field(
        None,
        description="Small picture URL"
    )
    picture_medium: Optional[str] = Field(
        None,
        description="Medium picture URL"
    )
    picture_big: Optional[str] = Field(
        None,
        description="Big picture URL"
    )
    picture_xl: Optional[str] = Field(
        None,
        description="Extra large picture URL"
    )
    tracklist: Optional[str] = Field(
        None,
        description="Link to tracklist"
    )
    type: Optional[str] = Field(
        None,
        description="Artist type"
    )

    model_config = ConfigDict(from_attributes=True)


class DiscogsData(BaseModel):
    """Schema for Discogs data."""
    uuid: str = Field(
        default_factory=lambda: str(uuid4()),
        description="Unique identifier for this Discogs data"
    )
    id: str = Field(
        ...,
        description="Discogs ID"
    )
    name: Optional[str] = Field(
        None,
        description="Name of the album or artist"
    )
    title: Optional[str] = Field(
        None,
        description="Title of the album"
    )
    link: Optional[str] = Field(
        None,
        description="Link to Discogs page"
    )
    picture: Optional[str] = Field(
        None,
        description="Main picture URL"
    )
    picture_small: Optional[str] = Field(
        None,
        description="Small picture URL"
    )
    picture_medium: Optional[str] = Field(
        None,
        description="Medium picture URL"
    )
    picture_big: Optional[str] = Field(
        None,
        description="Big picture URL"
    )
    picture_xl: Optional[str] = Field(
        None,
        description="Extra large picture URL"
    )
    nb_album: Optional[int] = Field(
        None,
        description="Number of albums"
    )
    nb_fan: Optional[int] = Field(
        None,
        description="Number of fans"
    )
    radio: Optional[bool] = Field(
        None,
        description="Whether radio is available"
    )
    tracklist: Optional[str] = Field(
        None,
        description="Link to tracklist"
    )
    md5_image: Optional[str] = Field(
        None,
        description="MD5 hash of the image"
    )
    genre_id: Optional[int] = Field(
        None,
        description="Genre ID"
    )
    nb_tracks: Optional[int] = Field(
        None,
        description="Number of tracks"
    )
    record_type: Optional[str] = Field(
        None,
        description="Type of record"
    )
    explicit_lyrics: Optional[bool] = Field(
        None,
        description="Whether lyrics are explicit"
    )
    artist: Optional[Artist] = Field(
        None,
        description="Artist information"
    )
    type: Optional[str] = Field(
        None,
        description="Type of the item"
    )

    model_config = ConfigDict(from_attributes=True)


class Track(BaseModel):
    """Schema for track information."""
    position: str = Field(
        ...,
        description="Track position"
    )
    title: str = Field(
        ...,
        description="Track title"
    )
    duration: str = Field(
        ...,
        description="Track duration"
    )

    model_config = ConfigDict(from_attributes=True)


class AlbumMetadata(BaseModel):
    """Schema for album metadata."""
    id: str = Field(
        ...,
        description="Album ID"
    )
    title: str = Field(
        ...,
        description="Album title"
    )
    artist: str = Field(
        ...,
        description="Artist name"
    )
    year: Optional[str] = Field(
        None,
        description="Release year"
    )
    image_url: Optional[str] = Field(
        None,
        description="URL of the album cover"
    )
    genres: List[str] = Field(
        default_factory=list,
        description="List of genres"
    )
    styles: List[str] = Field(
        default_factory=list,
        description="List of styles"
    )
    tracklist: List[Track] = Field(
        default_factory=list,
        description="List of tracks"
    )
    source: str = Field(
        ...,
        description="Source of the data (e.g., 'DISCOGS')"
    )

    model_config = ConfigDict(from_attributes=True)


class ArtistMetadata(BaseModel):
    """Schema for artist metadata."""
    id: str = Field(
        ...,
        description="Artist ID"
    )
    name: str = Field(
        ...,
        description="Artist name"
    )
    image_url: Optional[str] = Field(
        None,
        description="URL of the artist image"
    )
    biography: Optional[str] = Field(
        None,
        description="Artist biography"
    )
    genres: List[str] = Field(
        default_factory=list,
        description="List of genres"
    )
    country: Optional[str] = Field(
        None,
        description="Country of origin"
    )
    wikipedia_url: Optional[str] = Field(
        None,
        description="Link to Wikipedia page"
    )
    external_id: Optional[str] = Field(
        None,
        description="External artist ID"
    )
    external_url: Optional[str] = Field(
        None,
        description="External artist page URL"
    )
    members: List[str] = Field(
        default_factory=list,
        description="List of band members"
    )
    active_years: Optional[str] = Field(
        None,
        description="Years of activity"
    )
    aliases: List[str] = Field(
        default_factory=list,
        description="List of artist aliases"
    )
    source: str = Field(
        ...,
        description="Source of the data (e.g., 'DISCOGS')"
    )

    model_config = ConfigDict(from_attributes=True)
