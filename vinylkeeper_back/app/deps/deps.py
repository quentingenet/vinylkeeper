from fastapi import Depends
from sqlalchemy.orm import Session

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

# Services
from app.services.user_service import UserService
from app.services.collection_service import CollectionService
from app.services.search_service import SearchService
from app.services.external_reference_service import ExternalReferenceService
from app.services.dashboard_service import DashboardService
from app.services.wishlist_service import WishlistService

# Database
from app.db.session import get_db


# Repository Dependencies
def get_user_repository(db: Session = Depends(get_db)) -> UserRepository:
    return UserRepository(db)


def get_collection_repository(db: Session = Depends(get_db)) -> CollectionRepository:
    return CollectionRepository(db)


def get_wishlist_repository(db: Session = Depends(get_db)) -> WishlistRepository:
    return WishlistRepository(db)


def get_album_repository(db: Session = Depends(get_db)) -> AlbumRepository:
    return AlbumRepository(db)


def get_artist_repository(db: Session = Depends(get_db)) -> ArtistRepository:
    return ArtistRepository(db)


def get_like_repository(db: Session = Depends(get_db)) -> LikeRepository:
    return LikeRepository(db)


def get_collection_album_repository(db: Session = Depends(get_db)) -> CollectionAlbumRepository:
    return CollectionAlbumRepository(db)


def get_external_reference_repository(
    db: Session = Depends(get_db),
    wishlist_repo: WishlistRepository = Depends(get_wishlist_repository),
    collection_repo: CollectionRepository = Depends(get_collection_repository),
    album_repo: AlbumRepository = Depends(get_album_repository),
    artist_repo: ArtistRepository = Depends(get_artist_repository)
) -> ExternalReferenceRepository:
    return ExternalReferenceRepository(db, wishlist_repo, collection_repo, album_repo, artist_repo)


def get_dashboard_repository(db: Session = Depends(get_db)) -> DashboardRepository:
    return DashboardRepository(db)


# Service Dependencies
def get_collection_service(
    repository: CollectionRepository = Depends(get_collection_repository),
    like_repository: LikeRepository = Depends(get_like_repository),
    collection_album_repository: CollectionAlbumRepository = Depends(
        get_collection_album_repository),
    wishlist_repository: WishlistRepository = Depends(get_wishlist_repository)
) -> CollectionService:
    return CollectionService(repository, like_repository, collection_album_repository, wishlist_repository)


def get_search_service() -> SearchService:
    return SearchService()


def get_external_reference_service(
    repository: ExternalReferenceRepository = Depends(
        get_external_reference_repository)
) -> ExternalReferenceService:
    return ExternalReferenceService(repository)


def get_wishlist_service(
    wishlist_repo: WishlistRepository = Depends(get_wishlist_repository),
    external_ref_repo: ExternalReferenceRepository = Depends(get_external_reference_repository)
) -> WishlistService:
    return WishlistService(wishlist_repo, external_ref_repo)


def get_user_service(
    user_repo: UserRepository = Depends(get_user_repository),
    collection_service: CollectionService = Depends(get_collection_service)
) -> UserService:
    return UserService(user_repo, collection_service)


def get_dashboard_service(
    dashboard_repository: DashboardRepository = Depends(get_dashboard_repository),
    collection_repository: CollectionRepository = Depends(get_collection_repository),
) -> DashboardService:
    return DashboardService(dashboard_repository, collection_repository)
