"""
Common schema imports for convenience.
This module provides explicit imports of frequently used schemas.
"""

# User schemas
from .user_schema import (
    UserCreate, UserUpdate, UserResponse, UserDetailResponse, 
    UserSettingsResponse, UserMeResponse
)

# Collection schemas
from .collection_schema import (
    CollectionCreate, CollectionUpdate, CollectionResponse, 
    CollectionDetailResponse, CollectionAlbumResponse
)

# Album schemas
from .album_schema import (
    AlbumCreate, AlbumUpdate, AlbumResponse, AlbumDetailResponse
)

# Artist schemas
from .artist_schema import (
    ArtistCreate, ArtistUpdate, ArtistResponse, ArtistDetailResponse
)

# Wishlist schemas
from .wishlist_schema import (
    WishlistCreate, WishlistUpdate, WishlistResponse
)

# External reference schemas
from .external_reference_schema import (
    AddToWishlistRequest, AddToCollectionRequest, AddExternalResponse
)

# Request/Response schemas
from .like_schema import LikeCreate, LikeResponse
from .place_schema import PlaceCreate, PlaceResponse
from .moderation_request_schema import ModerationRequestCreate, ModerationRequestResponse

__all__ = [
    # User
    "UserCreate", "UserUpdate", "UserResponse", "UserDetailResponse", 
    "UserSettingsResponse", "UserMeResponse",
    # Collection
    "CollectionCreate", "CollectionUpdate", "CollectionResponse", 
    "CollectionDetailResponse", "CollectionAlbumResponse",
    # Album
    "AlbumCreate", "AlbumUpdate", "AlbumResponse", "AlbumDetailResponse",
    # Artist
    "ArtistCreate", "ArtistUpdate", "ArtistResponse", "ArtistDetailResponse",
    # Wishlist
    "WishlistCreate", "WishlistUpdate", "WishlistResponse",
    # External reference
    "AddToWishlistRequest", "AddToCollectionRequest", "AddExternalResponse",
    # Request/Response
    "LikeCreate", "LikeResponse",
    "PlaceCreate", "PlaceResponse",
    "ModerationRequestCreate", "ModerationRequestResponse",
] 