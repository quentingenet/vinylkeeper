from typing import List, Optional

from pydantic import Field

from app.schemas import BaseSchema


class MoodOption(BaseSchema):
    name: str
    description: Optional[str] = None
    albums_count: int


class EraOption(BaseSchema):
    decade: int = Field(..., description="First year of the decade, e.g. 1970")
    albums_count: int


class GenreOption(BaseSchema):
    name: str
    albums_count: int


class CollectionOption(BaseSchema):
    id: int
    name: str
    albums_count: int


class SpinningNowOptionsResponse(BaseSchema):
    """Filters available in the user's own collections (only values with albums)."""
    total_albums: int
    moods: List[MoodOption]
    eras: List[EraOption]
    genres: List[GenreOption]
    collections: List[CollectionOption]


class CollectionRef(BaseSchema):
    id: int
    name: str


class SpinningNowAlbum(BaseSchema):
    id: int
    external_album_id: str
    title: Optional[str] = None
    artist_name: Optional[str] = None
    image_url: Optional[str] = None
    year: Optional[int] = Field(None, description="Original release year, or pressing year when unknown")
    genres: List[str] = []
    styles: List[str] = []
    moods: List[str] = []
    collections: List[CollectionRef] = Field(..., description="The user's collections holding this album")


class SpinningNowResponse(BaseSchema):
    total: int = Field(..., description="Albums matching the filters")
    items: List[SpinningNowAlbum] = Field(..., description="Random selection among the matching albums")
