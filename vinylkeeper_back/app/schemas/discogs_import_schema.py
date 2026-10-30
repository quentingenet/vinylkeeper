from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class DiscogsImportCreate(BaseModel):
    """Import the collection of the Discogs account the user connected into one of their collections."""
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    collection_id: Optional[int] = Field(
        None, gt=0,
        description="Collection of the user receiving the records; none: a new collection is created for them",
    )
    save_copy: bool = Field(
        False, description="Save a copy of the receiving collection first (ignored for a new collection)"
    )
    include_wantlist: bool = Field(
        False, description="Then import the wantlist into the wishlist, in the same import"
    )


class DiscogsImportPreview(BaseModel):
    """The collection found on Discogs, before importing it."""
    discogs_username: str
    items_total: int = Field(..., description="Items of the Discogs collection, every format")
    wantlist_items_total: Optional[int] = Field(
        None, description="Items of the wantlist, every format; null when it cannot be read")
    wantlist_private: bool = Field(False, description="The wantlist is private: it cannot be imported")


class DiscogsImportResponse(BaseModel):
    """Status and counters of an import: progress while it runs, summary once done."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    collection_id: Optional[int] = None
    discogs_username: str
    created_collection: bool
    saved_copy_collection_id: Optional[int] = None
    saved_copy_name: Optional[str] = None
    status: str
    pages_total: int
    pages_done: int
    items_total: int
    vinyl_found: int
    other_formats: int
    added: int
    copies_added: int
    already_in_collection: int
    other_pressings: int
    in_other_collections: int
    include_wantlist: bool
    phase: str
    wantlist_items_total: int
    wantlist_vinyl_found: int
    wantlist_other_formats: int
    wantlist_added: int
    wantlist_already_in_wishlist: int
    wantlist_owned: int
    wantlist_other_pressings_owned: int
    wantlist_error: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    finished_at: Optional[datetime] = None


class DiscogsConnectionStatus(BaseModel):
    """The Discogs account the user connected, if any."""
    available: bool = Field(..., description="False while connecting a Discogs account is not configured")
    connected: bool
    discogs_username: Optional[str] = None
    connected_at: Optional[datetime] = None


class DiscogsAuthorizeResponse(BaseModel):
    authorize_url: str = Field(..., description="Discogs page where the user authorizes VinylKeeper")
