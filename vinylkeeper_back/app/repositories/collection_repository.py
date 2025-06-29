from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from app.models.collection_model import Collection
from app.models.album_model import Album
from app.models.artist_model import Artist
from app.models.collection_album import CollectionAlbum
from app.core.exceptions import (
    ResourceNotFoundError,
    DuplicateFieldError,
    ServerError,
    ErrorCode
)
from app.core.logging import logger
from typing import List, Optional
from sqlalchemy import or_



class CollectionRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, collection: Collection) -> Collection:
        """Create a new collection."""
        try:
            self.db.add(collection)
            self.db.commit()
            self.db.refresh(collection)
            return collection
        except IntegrityError as e:
            self.db.rollback()
            logger.error(f"Database integrity error creating collection: {str(e)}")
            raise DuplicateFieldError("name", collection.name)
        except Exception as e:
            self.db.rollback()
            logger.error(f"Unexpected error creating collection: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to create collection",
                details={"error": str(e)}
            )

    def get_by_id(self, collection_id: int, load_relations: bool = False) -> Collection:
        """Get a collection by its ID."""
        try:
            query = self.db.query(Collection).filter(Collection.id == collection_id)
            
            if load_relations:
                query = query.options(
                    joinedload(Collection.owner),
                    joinedload(Collection.collection_albums).joinedload(CollectionAlbum.album),
                    joinedload(Collection.collection_albums).joinedload(CollectionAlbum.state_record_ref),
                    joinedload(Collection.collection_albums).joinedload(CollectionAlbum.state_cover_ref),
                    joinedload(Collection.artists),
                    joinedload(Collection.mood),
                    joinedload(Collection.likes)
                )
            
            collection = query.first()
            if not collection:
                raise ResourceNotFoundError("Collection", collection_id)
            return collection
        except ResourceNotFoundError:
            raise
        except Exception as e:
            logger.error(f"Error retrieving collection {collection_id}: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to retrieve collection",
                details={"error": str(e)}
            )

    def get_by_owner(self, owner_id: int) -> List[Collection]:
        """Get all collections owned by a user."""
        try:
            return self.db.query(Collection).filter(
                Collection.owner_id == owner_id
            ).options(
                joinedload(Collection.owner),
                joinedload(Collection.collection_albums).joinedload(CollectionAlbum.album),
                joinedload(Collection.artists),
                joinedload(Collection.mood),
                joinedload(Collection.likes)
            ).order_by(Collection.updated_at.desc()).all()
        except Exception as e:
            logger.error(f"Error retrieving collections for owner {owner_id}: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to retrieve user collections",
                details={"error": str(e)}
            )

    def update(self, collection: Collection) -> Collection:
        """Update an existing collection."""
        try:
            self.db.commit()
            self.db.refresh(collection)
            return collection
        except IntegrityError as e:
            self.db.rollback()
            logger.error(f"Database integrity error updating collection: {str(e)}")
            raise DuplicateFieldError("name", collection.name)
        except Exception as e:
            self.db.rollback()
            logger.error(f"Unexpected error updating collection: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to update collection",
                details={"error": str(e)}
            )

    def delete(self, collection: Collection) -> None:
        """Delete a collection."""
        try:
            self.db.delete(collection)
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error deleting collection: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to delete collection",
                details={"error": str(e)}
            )

    def add_albums(self, collection: Collection, album_ids: List[int]) -> None:
        """Add albums to a collection."""
        try:
            albums = self.db.query(Album).filter(Album.id.in_(album_ids)).all()
            for album in albums:
                if not any(ca.album_id == album.id for ca in collection.collection_albums):
                    collection_album = CollectionAlbum(
                        collection_id=collection.id,
                        album_id=album.id
                    )
                    collection.collection_albums.append(collection_album)
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error adding albums to collection: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to add albums to collection",
                details={"error": str(e)}
            )

    def add_artists(self, collection: Collection, artist_ids: List[int]) -> None:
        """Add artists to a collection."""
        try:
            artists = self.db.query(Artist).filter(Artist.id.in_(artist_ids)).all()
            collection.artists.extend([a for a in artists if a not in collection.artists])
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error adding artists to collection: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to add artists to collection",
                details={"error": str(e)}
            )

    def remove_albums(self, collection: Collection, album_ids: List[int]) -> None:
        """Remove albums from a collection."""
        try:
            collection.collection_albums = [
                ca for ca in collection.collection_albums if ca.album_id not in album_ids
            ]
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error removing albums from collection: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to remove albums from collection",
                details={"error": str(e)}
            )

    def remove_artists(self, collection: Collection, artist_ids: List[int]) -> None:
        """Remove artists from a collection."""
        try:
            collection.artists = [a for a in collection.artists if a.id not in artist_ids]
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error removing artists from collection: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to remove artists from collection",
                details={"error": str(e)}
            )

    def get_public_collections(self, exclude_user_id: Optional[int] = None) -> List[Collection]:
        """Get all public collections, optionally excluding those owned by a specific user."""
        try:
            query = self.db.query(Collection).filter(Collection.is_public == True).options(
                joinedload(Collection.owner),
                joinedload(Collection.collection_albums).joinedload(CollectionAlbum.album),
                joinedload(Collection.artists),
                joinedload(Collection.mood),
                joinedload(Collection.likes)
            )
            
            if exclude_user_id is not None:
                query = query.filter(Collection.owner_id != exclude_user_id)
                
            return query.order_by(Collection.updated_at.desc()).all()
        except Exception as e:
            logger.error(f"Error retrieving public collections: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to retrieve public collections",
                details={"error": str(e)}
            )

    def search_collections(self, query: str, user_id: Optional[int] = None) -> List[Collection]:
        """Search collections by name or description"""
        try:
            search_query = f"%{query}%"
            base_query = self.db.query(Collection).filter(
                or_(
                    Collection.name.ilike(search_query),
                    Collection.description.ilike(search_query)
                )
            )

            if user_id:
                # Include user's private collections and all public collections
                return base_query.filter(
                    or_(
                        Collection.owner_id == user_id,
                        Collection.is_public == True
                    )
                ).order_by(Collection.updated_at.desc()).all()
            else:
                # Only include public collections
                return base_query.filter(Collection.is_public == True).order_by(Collection.updated_at.desc()).all()
        except Exception as e:
            logger.error(f"Error searching collections: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to search collections",
                details={"error": str(e)}
            )

    def get_collection_albums_paginated(self, collection_id: int, page: int = 1, limit: int = 12) -> tuple[List[CollectionAlbum], int]:
        """Get paginated albums for a collection."""
        try:
            offset = (page - 1) * limit
            
            # Get total count
            total = self.db.query(CollectionAlbum).filter(
                CollectionAlbum.collection_id == collection_id
            ).count()
            
            # Get paginated results
            albums = self.db.query(CollectionAlbum).filter(
                CollectionAlbum.collection_id == collection_id
            ).options(
                joinedload(CollectionAlbum.album)
            ).offset(offset).limit(limit).all()
            
            return albums, total
        except Exception as e:
            logger.error(f"Error retrieving paginated albums for collection {collection_id}: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to retrieve collection albums",
                details={"error": str(e)}
            )

    def get_collection_artists_paginated(self, collection_id: int, page: int = 1, limit: int = 12) -> tuple[List[Artist], int]:
        """Get paginated artists for a collection."""
        try:
            offset = (page - 1) * limit
            
            # Get total count
            total = self.db.query(Artist).join(
                Collection.artists
            ).filter(
                Collection.id == collection_id
            ).count()
            
            # Get paginated results
            artists = self.db.query(Artist).join(
                Collection.artists
            ).filter(
                Collection.id == collection_id
            ).offset(offset).limit(limit).all()
            
            return artists, total
        except Exception as e:
            logger.error(f"Error getting collection artists paginated: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to get collection artists",
                details={"error": str(e)}
            )

    def search_collection_albums(self, collection_id: int, query: str) -> List[Album]:
        """Search albums in a collection by title."""
        try:
            return self.db.query(Album).join(
                CollectionAlbum
            ).filter(
                CollectionAlbum.collection_id == collection_id,
                or_(
                    Album.title.ilike(f"%{query}%"),
                    Album.external_album_id.ilike(f"%{query}%")
                )
            ).all()
        except Exception as e:
            logger.error(f"Error searching collection albums: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to search collection albums",
                details={"error": str(e)}
            )

    def search_collection_artists(self, collection_id: int, query: str) -> List[Artist]:
        """Search artists in a collection by title."""
        try:
            return self.db.query(Artist).join(
                Collection.artists
            ).filter(
                Collection.id == collection_id,
                or_(
                    Artist.title.ilike(f"%{query}%"),
                    Artist.external_artist_id.ilike(f"%{query}%")
                )
            ).all()
        except Exception as e:
            logger.error(f"Error searching collection artists: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="Failed to search collection artists",
                details={"error": str(e)}
            )
