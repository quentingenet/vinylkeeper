from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date, datetime


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


class ValueAmounts(BaseModel):
    currency: str
    low: float = Field(..., description="Every copy priced Very Good (VG)")
    average: float = Field(..., description="Every copy priced Very Good Plus (VG+)")
    high: float = Field(..., description="Every copy priced Near Mint (NM)")


class CollectionValueResponse(BaseModel):
    """Estimated value of a collection, from Discogs suggested prices of its pressings."""
    collection_id: Optional[int] = Field(None, description="None when every collection is counted")
    collections: List[StatsCollection] = Field(default_factory=list, description="Collections to pick from")
    currency: str = Field(..., description="Currency the user picked, shown first")
    amounts: List[ValueAmounts] = Field(..., description="EUR, then USD once a rate is known")
    usd_rate: Optional[float] = Field(None, description="Dollars for one euro, ECB reference rate")
    rate_date: Optional[date] = Field(None, description="Date the USD rate was published")
    records_total: int = Field(..., description="Pressings counted")
    records_priced: int = Field(..., description="Pressings Discogs has a price for")
    pressings_to_confirm: int = Field(..., description="Pressings the owner has not confirmed yet")
    estimated_at: Optional[datetime] = Field(None, description="When the latest price was fetched")
    refresh_pending: int = Field(0, description="Pressings of any collection of the user queued for a re-evaluation")
    refreshable: int = Field(0, description="Pressings of any collection a re-evaluation would ask Discogs again")
    refreshes_left: int = Field(0, description="Re-evaluations the user has left in the last 24 hours")
    next_refresh_at: Optional[datetime] = Field(None, description="When a re-evaluation is allowed again")


class ValueRefreshResponse(BaseModel):
    """What a re-evaluation queued."""
    requested: int = Field(..., description="Pressings added to the queue")
    pending: int = Field(..., description="Pressings of the user waiting in the queue")
    estimated_seconds: int = Field(..., description="Time the queue of the user should take")
