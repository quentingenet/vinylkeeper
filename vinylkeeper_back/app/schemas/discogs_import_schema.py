from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

# Discogs usernames: letters, digits, dots, hyphens and underscores
DISCOGS_USERNAME_PATTERN = r"^[A-Za-z0-9._-]{1,100}$"


class DiscogsImportCreate(BaseModel):
    """Import the public Discogs collection of discogs_username into one collection of the user."""
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    discogs_username: str = Field(..., pattern=DISCOGS_USERNAME_PATTERN, description="Discogs username")
    collection_id: Optional[int] = Field(
        None, gt=0,
        description="Collection of the user receiving the records; none: a new collection is created for them",
    )
    save_copy: bool = Field(
        False, description="Save a copy of the receiving collection first (ignored for a new collection)"
    )
    include_wantlist: bool = Field(
        False, description="Then import the public wantlist into the wishlist, in the same import"
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
