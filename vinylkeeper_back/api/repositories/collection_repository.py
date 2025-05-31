from requests import Session
from api.models.collection_model import Collection
from api.models.album_model import Album
from api.models.artist_model import Artist
from api.models.genre_model import Genre
from api.schemas.collection_schemas import CollectionBase, CollectionCreate
from api.core.logging import logger
from typing import Tuple, List
from sqlalchemy.orm import joinedload

class CollectionRepository:
    
    def __init__(self, db: Session):
        self.db = db
        
    def create_collection(self, new_collection: CollectionCreate) -> Collection | None:
        try:
            collection = Collection(**new_collection.model_dump())
            self.db.add(collection)
            self.db.commit()
            self.db.refresh(collection)
            return collection
        except Exception as e:
            logger.error(f"Error creating collection: {e}")
            self.db.rollback()
            return None

    def get_collections(self, user_id: int, skip: int = 0, limit: int = 10) -> Tuple[List[Collection], int]:
        try:
            query = self.db.query(Collection).filter(Collection.user_id == user_id)
            total = query.count()
            collections = query.offset(skip).limit(limit).all()
            return collections, total
        except Exception as e:
            logger.error(f"Error getting collections for user {user_id}: {e}")
            raise
        
    def get_collection_by_id(self, collection_id: int, user_id: int) -> Collection | None:
        try:
            collection = self.db.query(Collection).options(joinedload(Collection.owner)).filter(
                Collection.id == collection_id,
                (Collection.user_id == user_id) | (Collection.is_public == True)
            ).first()
            return collection
        except Exception as e:
            logger.error(f"Error getting collection {collection_id} for user {user_id}: {e}")
            return None

    def get_public_collections(self, skip: int = 0, limit: int = 10, exclude_user_id: int = None) -> Tuple[List[Collection], int]:
        try:
            query = self.db.query(Collection).options(joinedload(Collection.owner)).filter(Collection.is_public == True)
            if exclude_user_id:
                query = query.filter(Collection.user_id != exclude_user_id)
            total = query.count()
            collections = query.offset(skip).limit(limit).all()
            return collections, total
        except Exception as e:
            logger.error(f"Error getting public collections: {e}")
            raise
        
    def switch_area_collection(self, collection_id: int, is_public: bool, user_id: int) -> bool:
        try:
            collection = self.db.query(Collection).filter(Collection.id == collection_id, Collection.user_id == user_id).first()
            if not collection:
                return False
            collection.is_public = is_public
            self.db.commit()
            return True
        except Exception as e:
            logger.error(f"Error switching area collection {collection_id}: {e}")
            self.db.rollback()
            return False
        
    def delete_collection(self, collection_id: int, user_id: int) -> bool:
        try:
            collection = self.db.query(Collection).filter(Collection.id == collection_id, Collection.user_id == user_id).first()
            if not collection:
                return False
            self.db.delete(collection)
            self.db.commit()
            return True
        except Exception as e:
            logger.error(f"Error deleting collection {collection_id}: {e}")
            self.db.rollback()
            return False
        
    def update_collection(self, collection_id: int, request_body: CollectionBase, user_id: int) -> bool:
        try:
            collection = self.db.query(Collection).filter(Collection.id == collection_id, Collection.user_id == user_id).first()
            if not collection:
                return False
            collection.name = request_body.name
            collection.description = request_body.description
            collection.is_public = request_body.is_public
            self.db.commit()
            return True
        except Exception as e:
            logger.error(f"Error updating collection {collection_id}: {e}")
            self.db.rollback()
            return False

    def remove_album_from_collection(self, collection_id: int, album_id: int, user_id: int) -> bool:
        try:
            collection = self.db.query(Collection).filter(Collection.id == collection_id, Collection.user_id == user_id).first()
            if not collection:
                return False
            
            album = self.db.query(Album).filter(Album.id == album_id).first()
            if not album:
                return False
            
            if album in collection.albums:
                collection.albums.remove(album)
                self.db.commit()
                return True
            return False
        except Exception as e:
            logger.error(f"Error removing album {album_id} from collection {collection_id}: {e}")
            self.db.rollback()
            return False

    def remove_artist_from_collection(self, collection_id: int, artist_id: int, user_id: int) -> bool:
        try:
            collection = self.db.query(Collection).filter(Collection.id == collection_id, Collection.user_id == user_id).first()
            if not collection:
                return False
            
            artist = self.db.query(Artist).filter(Artist.id == artist_id).first()
            if not artist:
                return False
            
            if artist in collection.artists:
                collection.artists.remove(artist)
                self.db.commit()
                return True
            return False
        except Exception as e:
            logger.error(f"Error removing artist {artist_id} from collection {collection_id}: {e}")
            self.db.rollback()
            return False

    def remove_genre_from_collection(self, collection_id: int, genre_id: int, user_id: int) -> bool:
        try:
            collection = self.db.query(Collection).filter(Collection.id == collection_id, Collection.user_id == user_id).first()
            if not collection:
                return False
            
            genre = self.db.query(Genre).filter(Genre.id == genre_id).first()
            if not genre:
                return False
            
            if genre in collection.genres:
                collection.genres.remove(genre)
                self.db.commit()
                return True
            return False
        except Exception as e:
            logger.error(f"Error removing genre {genre_id} from collection {collection_id}: {e}")
            self.db.rollback()
            return False
