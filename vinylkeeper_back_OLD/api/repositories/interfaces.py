from abc import ABC, abstractmethod
from typing import List, Optional, Tuple
from api.models.external_reference_model import ExternalReference, ExternalSourceEnum, ExternalItemTypeEnum
from api.models.wishlist_model import Wishlist
from api.models.collection_external_reference_model import CollectionExternalReference
from api.models.collection_model import Collection
from api.models.user_model import User
from api.schemas.collection_schemas import CollectionBase
from api.schemas.user_schemas import CreateUser
from api.schemas.request_proxy.request_proxy_deezer import SearchQuery, DeezerData


class IExternalReferenceRepository(ABC):
    
    @abstractmethod
    def find_by_external_id(
        self, 
        external_id: str, 
        source: ExternalSourceEnum, 
        item_type: ExternalItemTypeEnum
    ) -> Optional[ExternalReference]:
        pass
    
    @abstractmethod
    def create(self, external_reference: ExternalReference) -> ExternalReference:
        pass
    
    @abstractmethod
    def get_user_wishlist_items(self, user_id: int) -> List[ExternalReference]:
        pass
    
    @abstractmethod
    def get_collection_external_items(self, collection_id: int) -> List[ExternalReference]:
        pass


class IWishlistRepository(ABC):
    
    @abstractmethod
    def find_by_user_and_external_ref(self, user_id: int, external_reference_id: int) -> Optional[Wishlist]:
        pass
    
    @abstractmethod
    def create(self, wishlist_entry: Wishlist) -> Wishlist:
        pass
    
    @abstractmethod
    def delete(self, wishlist_entry: Wishlist) -> bool:
        pass


class ICollectionExternalReferenceRepository(ABC):
    
    @abstractmethod
    def find_by_collection_and_external_ref(
        self, 
        collection_id: int, 
        external_reference_id: int
    ) -> Optional[CollectionExternalReference]:
        pass
    
    @abstractmethod
    def create(self, collection_entry: CollectionExternalReference) -> CollectionExternalReference:
        pass
    
    @abstractmethod
    def delete(self, collection_entry: CollectionExternalReference) -> bool:
        pass


# Collection Repository Interfaces
class ICollectionRepository(ABC):
    """Interface for Collection repository operations"""
    
    @abstractmethod
    def create_collection(self, collection_data: CollectionBase, user_id: int) -> Optional[Collection]:
        pass
    
    @abstractmethod
    def get_user_collections(self, user_id: int, page: int, limit: int) -> Tuple[List[Collection], int]:
        pass
    
    @abstractmethod
    def get_public_collections(self, page: int, limit: int, exclude_user_id: int) -> Tuple[List[Collection], int]:
        pass
    
    @abstractmethod
    def get_collection_by_id(self, collection_id: int, user_id: int) -> Optional[Collection]:
        pass
    
    @abstractmethod
    def update_collection_area(self, collection_id: int, is_public: bool, user_id: int) -> bool:
        pass
    
    @abstractmethod
    def delete_collection(self, collection_id: int, user_id: int) -> bool:
        pass
    
    @abstractmethod
    def update_collection(self, collection_id: int, collection_data: CollectionBase, user_id: int) -> bool:
        pass
    
    @abstractmethod
    def remove_album_from_collection(self, collection_id: int, album_id: int, user_id: int) -> bool:
        pass
    
    @abstractmethod
    def remove_artist_from_collection(self, collection_id: int, artist_id: int, user_id: int) -> bool:
        pass
    
    @abstractmethod
    def remove_genre_from_collection(self, collection_id: int, genre_id: int, user_id: int) -> bool:
        pass


class IUserRepository(ABC):
    """Interface for User repository operations"""
    
    @abstractmethod
    def create_user(self, user_data: dict) -> Optional[User]:
        pass
    
    @abstractmethod
    def get_user_by_email(self, email: str) -> Optional[User]:
        pass
    
    @abstractmethod
    def get_user_by_uuid(self, user_uuid: str) -> Optional[User]:
        pass
    
    @abstractmethod
    def update_user_password(self, user_id: int, hashed_password: str) -> bool:
        pass
    
    @abstractmethod
    def verify_user_credentials(self, email: str, password: str) -> Optional[User]:
        pass


class ISearchRepository(ABC):
    """Interface for Search repository operations"""
    
    @abstractmethod
    def search_deezer_api(self, search_query: SearchQuery) -> List[DeezerData]:
        pass


class IMusicMetadataRepository(ABC):
    """Interface for Music Metadata repository operations"""
    
    @abstractmethod
    def fetch_deezer_album_metadata(self, album_id: str) -> Optional[dict]:
        pass
    
    @abstractmethod
    def fetch_musicbrainz_album_metadata(self, artist_name: str, album_title: str) -> Optional[dict]:
        pass
    
    @abstractmethod
    def fetch_musicbrainz_artist_metadata(self, artist_name: str) -> Optional[dict]:
        pass 