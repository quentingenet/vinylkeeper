from pydantic import BaseModel, Field
from typing import List

class TimeSeriesData(BaseModel):
    label: str
    data: List[int]

class DashboardStatsResponse(BaseModel):
    labels: List[str] = Field(..., description="List of time labels (e.g. months)")
    datasets: List[TimeSeriesData] = Field(..., description="List of datasets for the dashboard chart")
    user_albums_total: int = Field(..., description="Total albums in user's collections")
    user_artists_total: int = Field(..., description="Total artists in user's collections")
    user_collections_total: int = Field(..., description="Total collections of the user")
    global_places_total: int = Field(..., description="Total places (all users, hardcoded for now)")