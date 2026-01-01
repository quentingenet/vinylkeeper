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
    global_albums_total: int = Field(...,
                                     description="Total albums across all collections")
    global_artists_total: int = Field(...,
                                     description="Total artists across all collections")
    global_places_total: int = Field(...,
                                     description="Total places (all users)")
    moderated_places_total: int = Field(
        ..., description="Total moderated places (is_moderated=True)")
    latest_album: Optional[LatestAddition] = Field(
        None, description="Latest album added to any collection")
    latest_artist: Optional[LatestAddition] = Field(
        None, description="Latest artist added to any collection")
    recent_albums: List[LatestAddition] = Field(
        default_factory=list, description="Recent albums for mosaic display (3-5 items)")
