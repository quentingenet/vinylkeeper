from typing import List, Optional, Tuple, Dict, Any
from api.repositories.interfaces import ICollectionRepository, IExternalReferenceRepository
from api.models.collection_model import Collection
from api.schemas.collection_schemas import CollectionBase
from api.core.logging import logger


class CollectionService:
    """SOLID Collection Service - Business Logic Layer"""
    
    def __init__(
        self, 
        collection_repo: ICollectionRepository,
        external_repo: IExternalReferenceRepository
    ):
        self.collection_repo = collection_repo
        self.external_repo = external_repo
    
    def create_collection(self, collection_data: CollectionBase, user_id: int) -> Optional[Collection]:
        """Create a new collection with business validation"""
        
        # Business rule: Collection name cannot be empty
        if not collection_data.name or not collection_data.name.strip():
            logger.warning(f"Attempted to create collection with empty name for user {user_id}")
            return None
        
        # Business rule: Collection name length validation
        if len(collection_data.name.strip()) < 2:
            logger.warning(f"Collection name too short for user {user_id}")
            return None
        
        return self.collection_repo.create_collection(collection_data, user_id)
    
    def get_user_collections(self, user_id: int, page: int, limit: int) -> Tuple[List[Collection], int]:
        """Get user's collections with pagination"""
        
        # Business rule: Validate pagination parameters
        if page < 1:
            page = 1
        if limit < 1 or limit > 100:
            limit = 10
        
        return self.collection_repo.get_user_collections(user_id, page, limit)
    
    def get_public_collections(self, page: int, limit: int, exclude_user_id: int) -> Tuple[List[Collection], int]:
        """Get public collections excluding user's own"""
        
        # Business rule: Validate pagination parameters
        if page < 1:
            page = 1
        if limit < 1 or limit > 100:
            limit = 10
        
        return self.collection_repo.get_public_collections(page, limit, exclude_user_id)
    
    def get_collection_by_id(self, collection_id: int, user_id: int) -> Optional[Collection]:
        """Get collection by ID with access control"""
        
        # Business rule: Validate collection ID
        if collection_id <= 0:
            return None
        
        return self.collection_repo.get_collection_by_id(collection_id, user_id)
    
    def update_collection_area(self, collection_id: int, is_public: bool, user_id: int) -> bool:
        """Update collection visibility with business rules"""
        
        # Business rule: Validate collection ID
        if collection_id <= 0:
            return False
        
        return self.collection_repo.update_collection_area(collection_id, is_public, user_id)
    
    def delete_collection(self, collection_id: int, user_id: int) -> bool:
        """Delete collection with ownership validation"""
        
        # Business rule: Validate collection ID
        if collection_id <= 0:
            return False
        
        return self.collection_repo.delete_collection(collection_id, user_id)
    
    def update_collection(self, collection_id: int, collection_data: CollectionBase, user_id: int) -> bool:
        """Update collection with business validation"""
        
        # Business rule: Validate collection ID
        if collection_id <= 0:
            return False
        
        # Business rule: Collection name cannot be empty
        if not collection_data.name or not collection_data.name.strip():
            logger.warning(f"Attempted to update collection {collection_id} with empty name")
            return False
        
        # Business rule: Collection name length validation
        if len(collection_data.name.strip()) < 2:
            logger.warning(f"Collection name too short for collection {collection_id}")
            return False
        
        return self.collection_repo.update_collection(collection_id, collection_data, user_id)
    
    def get_collection_details(self, collection_id: int, user_id: int) -> Optional[Dict[str, Any]]:
        """Get complete collection details including external items"""
        
        # Business rule: Validate collection ID
        if collection_id <= 0:
            return None
        
        # Get basic collection info
        collection = self.collection_repo.get_collection_by_id(collection_id, user_id)
        if not collection:
            return None
        
        # Get external references
        external_items = self.external_repo.get_collection_external_items(collection_id)
        
        # Business logic: Separate albums and artists
        external_albums = [item for item in external_items if item.item_type.value == "album"]
        external_artists = [item for item in external_items if item.item_type.value == "artist"]
        
        # Business logic: Format response
        return {
            "collection": collection,
            "local_albums": [
                {
                    "id": album.id, 
                    "title": album.title, 
                    "artist": album.artist.name if album.artist else "Unknown"
                } for album in collection.albums
            ],
            "local_artists": [
                {
                    "id": artist.id, 
                    "name": artist.name
                } for artist in collection.artists
            ],
            "local_genres": [
                {
                    "id": genre.id, 
                    "name": genre.name
                } for genre in collection.genres
            ],
            "external_albums": [
                {
                    "id": item.id,
                    "external_id": item.external_id,
                    "title": item.title,
                    "artist_name": item.artist_name,
                    "picture_medium": item.picture_medium
                } for item in external_albums
            ],
            "external_artists": [
                {
                    "id": item.id,
                    "external_id": item.external_id,
                    "title": item.title,
                    "picture_medium": item.picture_medium
                } for item in external_artists
            ]
        }
    
    def remove_album_from_collection(self, collection_id: int, album_id: int, user_id: int) -> bool:
        """Remove album from collection with validation"""
        
        # Business rule: Validate IDs
        if collection_id <= 0 or album_id <= 0:
            return False
        
        return self.collection_repo.remove_album_from_collection(collection_id, album_id, user_id)
    
    def remove_artist_from_collection(self, collection_id: int, artist_id: int, user_id: int) -> bool:
        """Remove artist from collection with validation"""
        
        # Business rule: Validate IDs
        if collection_id <= 0 or artist_id <= 0:
            return False
        
        return self.collection_repo.remove_artist_from_collection(collection_id, artist_id, user_id)
    
    def remove_genre_from_collection(self, collection_id: int, genre_id: int, user_id: int) -> bool:
        """Remove genre from collection with validation"""
        
        # Business rule: Validate IDs
        if collection_id <= 0 or genre_id <= 0:
            return False
        
        return self.collection_repo.remove_genre_from_collection(collection_id, genre_id, user_id) 