from uuid import UUID

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user_model import User
from app.core.exceptions import ForbiddenError, ErrorCode, ResourceNotFoundError
from app.utils.auth_utils.auth import get_current_user

# Repositories
from app.repositories.user_repository import UserRepository
from app.repositories.collection_repository import CollectionRepository
from app.repositories.wishlist_repository import WishlistRepository
from app.repositories.album_repository import AlbumRepository
from app.repositories.artist_repository import ArtistRepository
from app.repositories.external_reference_repository import ExternalReferenceRepository
from app.repositories.like_repository import LikeRepository
from app.repositories.collection_album_repository import CollectionAlbumRepository
from app.repositories.dashboard_repository import DashboardRepository
from app.repositories.place_repository import PlaceRepository
from app.repositories.moderation_request_repository import ModerationRequestRepository

# Services
from app.services.user_service import UserService
from app.services.collection_service import CollectionService
from app.services.search_service import SearchService
from app.services.external_reference_service import ExternalReferenceService
from app.services.dashboard_service import DashboardService
from app.services.wishlist_service import WishlistService
from app.services.place_service import PlaceService
from app.services.moderation_service import ModerationService
from app.services.export_service import ExportService
from app.services.wishlist_export_service import WishlistExportService

# Database
from app.db.session import get_db


def require_admin(user: User = Depends(get_current_user)) -> User:
    if not (user.role and user.role.name == "admin" and user.is_superuser):
        raise ForbiddenError(error_code=ErrorCode.FORBIDDEN, message="Admin access required")
    return user


# Repository Dependencies
def get_user_repository(db: AsyncSession = Depends(get_db)) -> UserRepository:
    return UserRepository(db)


async def get_user_id_by_uuid(
    user_uuid: UUID,
    user_repo: UserRepository = Depends(get_user_repository),
) -> int:
    """Resolve a public user_uuid path/query param to the internal user_id.

    Usage in endpoints:
        @router.get("/collections/owner/{user_uuid}")
        async def get_collections(owner_id: int = Depends(get_user_id_by_uuid)):
            ...
    """
    user = await user_repo.get_user_by_uuid(str(user_uuid))
    if not user:
        raise ResourceNotFoundError("User", str(user_uuid))
    return user.id


def get_collection_repository(db: AsyncSession = Depends(get_db)) -> CollectionRepository:
    return CollectionRepository(db)


def get_wishlist_repository(db: AsyncSession = Depends(get_db)) -> WishlistRepository:
    return WishlistRepository(db)


def get_album_repository(db: AsyncSession = Depends(get_db)) -> AlbumRepository:
    return AlbumRepository(db)


def get_artist_repository(db: AsyncSession = Depends(get_db)) -> ArtistRepository:
    return ArtistRepository(db)


def get_like_repository(db: AsyncSession = Depends(get_db)) -> LikeRepository:
    return LikeRepository(db)


def get_collection_album_repository(db: AsyncSession = Depends(get_db)) -> CollectionAlbumRepository:
    return CollectionAlbumRepository(db)


def get_external_reference_repository(
    db: AsyncSession = Depends(get_db),
    wishlist_repo: WishlistRepository = Depends(get_wishlist_repository),
    collection_repo: CollectionRepository = Depends(get_collection_repository),
    album_repo: AlbumRepository = Depends(get_album_repository),
    artist_repo: ArtistRepository = Depends(get_artist_repository)
) -> ExternalReferenceRepository:
    return ExternalReferenceRepository(db, wishlist_repo, collection_repo, album_repo, artist_repo)


def get_dashboard_repository(db: AsyncSession = Depends(get_db)) -> DashboardRepository:
    return DashboardRepository(db)


def get_place_repository(db: AsyncSession = Depends(get_db)) -> PlaceRepository:
    return PlaceRepository(db)


def get_moderation_request_repository(db: AsyncSession = Depends(get_db)) -> ModerationRequestRepository:
    """Get moderation request repository instance."""
    return ModerationRequestRepository(db)


# Service Dependencies
def get_collection_service(
    repository: CollectionRepository = Depends(get_collection_repository),
    like_repository: LikeRepository = Depends(get_like_repository),
    collection_album_repository: CollectionAlbumRepository = Depends(
        get_collection_album_repository),
    wishlist_repository: WishlistRepository = Depends(get_wishlist_repository),
    place_repository: PlaceRepository = Depends(get_place_repository)
) -> CollectionService:
    return CollectionService(repository, like_repository, collection_album_repository, wishlist_repository, place_repository)


def get_search_service(request: Request) -> SearchService:
    """Get SearchService with shared HTTP client from app state."""
    http_client = request.app.state.http_client
    return SearchService(http_client)


def get_external_reference_service(
    repository: ExternalReferenceRepository = Depends(
        get_external_reference_repository)
) -> ExternalReferenceService:
    return ExternalReferenceService(repository)


def get_wishlist_service(
    wishlist_repo: WishlistRepository = Depends(get_wishlist_repository),
    external_ref_repo: ExternalReferenceRepository = Depends(
        get_external_reference_repository)
) -> WishlistService:
    return WishlistService(wishlist_repo, external_ref_repo)


def get_place_service(
    place_repo: PlaceRepository = Depends(get_place_repository),
    moderation_request_repo: ModerationRequestRepository = Depends(
        get_moderation_request_repository)
) -> PlaceService:
    return PlaceService(place_repo, moderation_request_repo)


def get_user_service(
    user_repo: UserRepository = Depends(get_user_repository),
    collection_service: CollectionService = Depends(get_collection_service)
) -> UserService:
    return UserService(user_repo, collection_service)


def get_dashboard_service(
    dashboard_repository: DashboardRepository = Depends(
        get_dashboard_repository),
) -> DashboardService:
    return DashboardService(dashboard_repository)


def get_moderation_service(
    moderation_repo: ModerationRequestRepository = Depends(
        get_moderation_request_repository),
    place_repo: PlaceRepository = Depends(get_place_repository)
) -> ModerationService:
    """Get moderation service instance."""
    return ModerationService(moderation_repo, place_repo)


def get_export_service(
    collection_repository: CollectionRepository = Depends(get_collection_repository),
    collection_album_repository: CollectionAlbumRepository = Depends(
        get_collection_album_repository
    ),
) -> ExportService:
    return ExportService(collection_repository, collection_album_repository)


def get_wishlist_export_service(
    wishlist_repository: WishlistRepository = Depends(get_wishlist_repository),
) -> WishlistExportService:
    return WishlistExportService(wishlist_repository)
