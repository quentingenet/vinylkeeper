from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from api.repositories.interfaces import ICollectionRepository
from api.models.collection_model import Collection
from api.schemas.collection_schemas import CollectionBase
from api.core.logging import logger


class CollectionRepository(ICollectionRepository):
    """SOLID implementation of Collection repository"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_collection(self, collection_data: CollectionBase, user_id: int) -> Optional[Collection]:
        """Create a new collection"""
        try:
            new_collection = Collection(
                name=collection_data.name,
                description=collection_data.description,
                is_public=collection_data.is_public,
                user_id=user_id
            )
            
            self.db.add(new_collection)
            self.db.commit()
            self.db.refresh(new_collection)
            
            logger.info(f"Collection created: {new_collection.name} for user {user_id}")
            return new_collection
            
        except Exception as e:
            logger.error(f"Error creating collection: {str(e)}")
            self.db.rollback()
            return None
    
    def get_user_collections(self, user_id: int, page: int, limit: int) -> Tuple[List[Collection], int]:
        """Get user's collections with pagination"""
        try:
            offset = (page - 1) * limit
            
            collections = (
                self.db.query(Collection)
                .filter(Collection.user_id == user_id)
                .offset(offset)
                .limit(limit)
                .all()
            )
            
            total = self.db.query(Collection).filter(Collection.user_id == user_id).count()
            
            return collections, total
            
        except Exception as e:
            logger.error(f"Error fetching user collections: {str(e)}")
            return [], 0
    
    def get_public_collections(self, page: int, limit: int, exclude_user_id: int) -> Tuple[List[Collection], int]:
        """Get public collections excluding user's own collections"""
        try:
            offset = (page - 1) * limit
            
            collections = (
                self.db.query(Collection)
                .filter(and_(Collection.is_public == True, Collection.user_id != exclude_user_id))
                .offset(offset)
                .limit(limit)
                .all()
            )
            
            total = (
                self.db.query(Collection)
                .filter(and_(Collection.is_public == True, Collection.user_id != exclude_user_id))
                .count()
            )
            
            return collections, total
            
        except Exception as e:
            logger.error(f"Error fetching public collections: {str(e)}")
            return [], 0
    
    def get_collection_by_id(self, collection_id: int, user_id: int) -> Optional[Collection]:
        """Get collection by ID if user has access"""
        try:
            collection = (
                self.db.query(Collection)
                .filter(
                    and_(
                        Collection.id == collection_id,
                        or_(Collection.user_id == user_id, Collection.is_public == True)
                    )
                )
                .first()
            )
            
            return collection
            
        except Exception as e:
            logger.error(f"Error fetching collection by ID: {str(e)}")
            return None
    
    def update_collection_area(self, collection_id: int, is_public: bool, user_id: int) -> bool:
        """Update collection visibility"""
        try:
            collection = (
                self.db.query(Collection)
                .filter(and_(Collection.id == collection_id, Collection.user_id == user_id))
                .first()
            )
            
            if not collection:
                return False
            
            collection.is_public = is_public
            self.db.commit()
            
            logger.info(f"Collection {collection_id} visibility updated to {'public' if is_public else 'private'}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating collection area: {str(e)}")
            self.db.rollback()
            return False
    
    def delete_collection(self, collection_id: int, user_id: int) -> bool:
        """Delete collection if user owns it"""
        try:
            collection = (
                self.db.query(Collection)
                .filter(and_(Collection.id == collection_id, Collection.user_id == user_id))
                .first()
            )
            
            if not collection:
                return False
            
            self.db.delete(collection)
            self.db.commit()
            
            logger.info(f"Collection {collection_id} deleted successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting collection: {str(e)}")
            self.db.rollback()
            return False
    
    def update_collection(self, collection_id: int, collection_data: CollectionBase, user_id: int) -> bool:
        """Update collection data"""
        try:
            collection = (
                self.db.query(Collection)
                .filter(and_(Collection.id == collection_id, Collection.user_id == user_id))
                .first()
            )
            
            if not collection:
                return False
            
            collection.name = collection_data.name
            collection.description = collection_data.description
            collection.is_public = collection_data.is_public
            
            self.db.commit()
            
            logger.info(f"Collection {collection_id} updated successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error updating collection: {str(e)}")
            self.db.rollback()
            return False
    
    def remove_album_from_collection(self, collection_id: int, album_id: int, user_id: int) -> bool:
        """Remove album from collection"""
        try:
            collection = (
                self.db.query(Collection)
                .filter(and_(Collection.id == collection_id, Collection.user_id == user_id))
                .first()
            )
            
            if not collection:
                return False
            
            # Find and remove the album from collection's albums
            album_to_remove = None
            for album in collection.albums:
                if album.id == album_id:
                    album_to_remove = album
                    break
            
            if not album_to_remove:
                return False
            
            collection.albums.remove(album_to_remove)
            self.db.commit()
            
            logger.info(f"Album {album_id} removed from collection {collection_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error removing album from collection: {str(e)}")
            self.db.rollback()
            return False
    
    def remove_artist_from_collection(self, collection_id: int, artist_id: int, user_id: int) -> bool:
        """Remove artist from collection"""
        try:
            collection = (
                self.db.query(Collection)
                .filter(and_(Collection.id == collection_id, Collection.user_id == user_id))
                .first()
            )
            
            if not collection:
                return False
            
            # Find and remove the artist from collection's artists
            artist_to_remove = None
            for artist in collection.artists:
                if artist.id == artist_id:
                    artist_to_remove = artist
                    break
            
            if not artist_to_remove:
                return False
            
            collection.artists.remove(artist_to_remove)
            self.db.commit()
            
            logger.info(f"Artist {artist_id} removed from collection {collection_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error removing artist from collection: {str(e)}")
            self.db.rollback()
            return False
    
    def remove_genre_from_collection(self, collection_id: int, genre_id: int, user_id: int) -> bool:
        """Remove genre from collection"""
        try:
            collection = (
                self.db.query(Collection)
                .filter(and_(Collection.id == collection_id, Collection.user_id == user_id))
                .first()
            )
            
            if not collection:
                return False
            
            # Find and remove the genre from collection's genres
            genre_to_remove = None
            for genre in collection.genres:
                if genre.id == genre_id:
                    genre_to_remove = genre
                    break
            
            if not genre_to_remove:
                return False
            
            collection.genres.remove(genre_to_remove)
            self.db.commit()
            
            logger.info(f"Genre {genre_id} removed from collection {collection_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error removing genre from collection: {str(e)}")
            self.db.rollback()
            return False 