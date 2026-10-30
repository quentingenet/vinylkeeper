from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class LatestAddition(BaseModel):
    id: int
    name: str
    username: str
    created_at: datetime
    type: str = Field(..., description="Type: 'album' or 'artist'")
    image_url: Optional[str] = Field(
        None, description="Image URL for thumbnail")
    external_id: Optional[str] = Field(
        None, description="External ID for the item")


class DashboardStatsResponse(BaseModel):
    user_albums_total: int = Field(...,
                                   description="Total albums in user's collections")
    user_artists_total: int = Field(...,
                                    description="Total artists in user's collections")
    user_collections_total: int = Field(...,
                                        description="Total collections of the user")
    user_public_collections_total: int = Field(...,
                                               description="Total public collections of the user")
    global_albums_total: int = Field(...,
                                     description="Total albums across all collections")
    global_artists_total: int = Field(...,
                                      description="Total artists across all collections")
    global_places_total: int = Field(...,
                                     description="Total places (all users)")
    moderated_places_total: int = Field(
        ..., description="Total moderated places (is_moderated=True)")
    public_collections_total: int = Field(
        ..., description="Total public collections with at least one album or artist")
    latest_album: Optional[LatestAddition] = Field(
        None, description="Latest album added to any collection")
    latest_artist: Optional[LatestAddition] = Field(
        None, description="Latest artist added to any collection")
    recent_albums: List[LatestAddition] = Field(
        default_factory=list, description="Recent albums for mosaic display (3-5 items)")


class BreakdownEntry(BaseModel):
    label: str
    count: int


class EraEntry(BaseModel):
    decade: int = Field(..., description="First year of the decade, e.g. 1970")
    count: int


class StatsCollection(BaseModel):
    id: int
    name: str


class PressingsBreakdown(BaseModel):
    originals: int = Field(..., description="Pressed the year of the work, or earlier")
    reissues: int
    unknown: int = Field(..., description="Pressing or original year not known")
    countries: List[BreakdownEntry] = Field(default_factory=list, description="Most frequent first")
    formats: List[BreakdownEntry] = Field(default_factory=list, description="Most frequent first")


class CollectionBreakdownResponse(BaseModel):
    """The records of the user, or of one of their collections, by era, genre, mood and pressing."""
    collection_id: Optional[int] = None
    collections: List[StatsCollection] = Field(default_factory=list, description="Collections to pick from")
    albums_total: int = Field(..., description="Records (works): the pressings of a record count once")
    eras: List[EraEntry] = Field(default_factory=list)
    genres: List[BreakdownEntry] = Field(default_factory=list)
    moods: List[BreakdownEntry] = Field(default_factory=list)
    pressings: PressingsBreakdown
