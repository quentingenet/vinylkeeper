from fastapi import Depends
from sqlalchemy.orm import Session
from api.db.session import get_db
from api.repositories.external_reference_repository_solid import ExternalReferenceRepository
from api.repositories.wishlist_repository_solid import WishlistRepository
from api.repositories.collection_external_reference_repository_solid import CollectionExternalReferenceRepository
from api.repositories.collection_repository_solid import CollectionRepository
from api.repositories.user_repository_solid import UserRepository
from api.repositories.search_repository_solid import SearchRepository
from api.repositories.music_metadata_repository_solid import MusicMetadataRepository
from api.services.external_reference_service_solid import ExternalReferenceService
from api.services.validation_service import ValidationService
from api.services.collection_service_solid import CollectionService
from api.services.user_service_solid import UserService
from api.services.search_service_solid import SearchService
from api.services.music_metadata_service_solid import MusicMetadataService
from api.repositories.interfaces import (
    IExternalReferenceRepository, 
    IWishlistRepository, 
    ICollectionExternalReferenceRepository,
    ICollectionRepository,
    IUserRepository,
    ISearchRepository,
    IMusicMetadataRepository
)


# Repository Dependencies
def get_external_reference_repository(db: Session = Depends(get_db)) -> IExternalReferenceRepository:
    return ExternalReferenceRepository(db)

def get_wishlist_repository(db: Session = Depends(get_db)) -> IWishlistRepository:
    return WishlistRepository(db)

def get_collection_external_reference_repository(db: Session = Depends(get_db)) -> ICollectionExternalReferenceRepository:
    return CollectionExternalReferenceRepository(db)

def get_collection_repository(db: Session = Depends(get_db)) -> ICollectionRepository:
    return CollectionRepository(db)

def get_user_repository(db: Session = Depends(get_db)) -> IUserRepository:
    return UserRepository(db)

def get_search_repository() -> ISearchRepository:
    return SearchRepository()

def get_music_metadata_repository() -> IMusicMetadataRepository:
    return MusicMetadataRepository()


# Service Dependencies
def get_external_reference_service_solid(
    external_repo: IExternalReferenceRepository = Depends(get_external_reference_repository),
    wishlist_repo: IWishlistRepository = Depends(get_wishlist_repository),
    collection_repo: ICollectionExternalReferenceRepository = Depends(get_collection_external_reference_repository)
) -> ExternalReferenceService:
    return ExternalReferenceService(external_repo, wishlist_repo, collection_repo)

def get_validation_service(db: Session = Depends(get_db)) -> ValidationService:
    return ValidationService(db)

def get_collection_service_solid(
    collection_repo: ICollectionRepository = Depends(get_collection_repository),
    external_repo: IExternalReferenceRepository = Depends(get_external_reference_repository)
) -> CollectionService:
    return CollectionService(collection_repo, external_repo)

def get_user_service_solid(
    user_repo: IUserRepository = Depends(get_user_repository)
) -> UserService:
    return UserService(user_repo)

def get_search_service_solid(
    search_repo: ISearchRepository = Depends(get_search_repository)
) -> SearchService:
    return SearchService(search_repo)

def get_music_metadata_service_solid(
    music_metadata_repo: IMusicMetadataRepository = Depends(get_music_metadata_repository)
) -> MusicMetadataService:
    return MusicMetadataService(music_metadata_repo) 