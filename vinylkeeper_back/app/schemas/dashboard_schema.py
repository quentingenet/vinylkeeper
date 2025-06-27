from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class TimeSeriesData(BaseModel):
    label: str
    data: List[int]

class LatestAddition(BaseModel):
    id: int
    name: str
    username: str
    created_at: datetime
    type: str = Field(..., description="Type: 'album' or 'artist'")
    image_url: Optional[str] = Field(None, description="Image URL for thumbnail")

class DashboardStatsResponse(BaseModel):
    labels: List[str] = Field(..., description="List of time labels (e.g. months)")
    datasets: List[TimeSeriesData] = Field(..., description="List of datasets for the dashboard chart")
    user_albums_total: int = Field(..., description="Total albums in user's collections")
    user_artists_total: int = Field(..., description="Total artists in user's collections")
    user_collections_total: int = Field(..., description="Total collections of the user")
    global_places_total: int = Field(..., description="Total places (all users, hardcoded for now)")
    moderated_places_total: int = Field(..., description="Total moderated places (is_moderated=True)")
    latest_album: Optional[LatestAddition] = Field(None, description="Latest album added to any collection")
    latest_artist: Optional[LatestAddition] = Field(None, description="Latest artist added to any collection")