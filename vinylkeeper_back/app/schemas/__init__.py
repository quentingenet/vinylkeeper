from pydantic import BaseModel, ConfigDict


class BaseSchema(BaseModel):
    """Base schema with common configuration for all schemas."""
    model_config = ConfigDict(from_attributes=True)


# Import all schemas
from .user_schema import *
from .album_schema import *
from .artist_schema import *
from .collection_schema import *
from .collection_album_schema import *
from .wishlist_schema import *
from .external_reference_schema import *
from .dashboard_schema import *
from .like_schema import *
from .loan_schema import *
from .moderation_request_schema import *
from .place_schema import *
from .place_like_schema import *
from .role_schema import *
from .request_proxy.request_proxy_schema import *

__all__ = [
    "BaseModel",
    "BaseSchema",
    # User schemas
    "UserCreate", "UserUpdate", "UserInDB", "UserResponse", "UserDetailResponse", "UserMiniResponse",
    "UserSettingsResponse", "PasswordChangeRequest", "ContactMessageRequest",
    # Album schemas
    "AlbumBase", "AlbumCreate", "AlbumUpdate", "AlbumInDB", "AlbumResponse", "AlbumDetailResponse", "AlbumInCollection",
    # Artist schemas
    "ArtistBase", "ArtistCreate", "ArtistUpdate", "ArtistInDB", "ArtistResponse", "ArtistDetailResponse",
    # Collection schemas
    "CollectionBase", "CollectionCreate", "CollectionUpdate", "CollectionInDB", "CollectionResponse", 
    "CollectionDetailResponse", "CollectionVisibilityUpdate", "AlbumInCollection", "CollectionAlbumResponse",
    "CollectionArtistResponse", "PaginatedAlbumsResponse", "PaginatedArtistsResponse", "PaginatedCollectionResponse",
    # Collection Album schemas
    "CollectionAlbumCreate", "CollectionAlbumUpdate", "CollectionAlbumMetadataResponse",
    # Wishlist schemas
    "WishlistBase", "WishlistCreate", "WishlistUpdate", "WishlistInDB", "WishlistResponse", "WishlistDetailResponse",
    # External Reference schemas
    "ExternalReferenceBase", "AddToWishlistRequest", "AddToCollectionRequest", "AlbumStateData",
    "WishlistItemResponse", "CollectionItemResponse", "AddExternalResponse",
    # Dashboard schemas
    "DashboardStats", "ChartDataset", "ChartData",
    # Like schemas
    "LikeCreate", "LikeResponse", "LikeStatusResponse",
    # Place Like schemas
    "PlaceLikeCreate", "PlaceLikeResponse", "PlaceLikeStatusResponse",
    # Loan schemas
    "LoanCreate", "LoanUpdate", "LoanInDB", "LoanResponse",
    # Moderation Request schemas
    "ModerationRequestBase", "ModerationRequestCreate", "ModerationRequestUpdate", "ModerationRequestInDB", "ModerationRequestResponse",
    # Place schemas
    "PlaceBase", "PlaceCreate", "PlaceUpdate", "PlaceInDB", "PlaceResponse",
    # Role schemas
    "RoleBase", "RoleCreate", "RoleUpdate", "RoleInDB", "RoleResponse",
    # Request Proxy schemas
    "RequestProxyBase", "RequestProxyCreate", "RequestProxyUpdate", "RequestProxyInDB", "RequestProxyResponse",
    "PaginatedRequestProxyResponse", "DiscogsData", "Artist", "Album", "Track", "MusicBrainzData",
    "ExternalReferenceData", "SearchResult", "SearchResponse"
]
