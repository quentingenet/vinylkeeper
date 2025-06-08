from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, NoResultFound
from typing import List, Optional, Tuple
from app.repositories.collection_repository import CollectionRepository
from app.models.collection_model import Collection
from app.schemas.collection_schema import CollectionCreate, CollectionUpdate
from app.repositories.like_repository import LikeRepository
from app.schemas.like_schema import LikeStatusResponse
from app.core.exceptions import (
    ResourceNotFoundError,
    ForbiddenError,
    DuplicateFieldError,
    AppException,
)
from datetime import datetime


class CollectionService:
    def __init__(self, db: Session):
        self.repository = CollectionRepository(db)
        self.like_repository = LikeRepository(db)

    def create_collection(self, data: CollectionCreate, owner_id: int) -> Collection:
        collection = Collection(
            name=data.name,
            description=data.description,
            is_public=data.is_public,
            owner_id=owner_id,
        )
        try:
            self.repository.create(collection)
            if data.album_ids:
                self.repository.add_albums(collection, data.album_ids)
            if data.artist_ids:
                self.repository.add_artists(collection, data.artist_ids)
            return collection
        except IntegrityError as e:
            raise DuplicateFieldError("name", data.name)
        except Exception as e:
            raise AppException(
                error_code=5000,
                message="Failed to create collection",
                status_code=500,
                details={"error": str(e)},
            )

    def get_user_collections(self, owner_id: int, page: int, limit: int) -> Tuple[List[Collection], int]:
        try:
            collections = self.repository.get_by_owner(owner_id)
            total = len(collections)
            start = (page - 1) * limit
            end = start + limit
            return collections[start:end], total
        except Exception as e:
            raise AppException(
                error_code=5001,
                message="Failed to retrieve collections",
                status_code=500,
                details={"error": str(e)},
            )

    def get_public_collections(self, page: int, limit: int, exclude_user_id: Optional[int] = None) -> Tuple[List[Collection], int]:
        try:
            collections = self.repository.get_public_collections(
                exclude_user_id)
            total = len(collections)
            start = (page - 1) * limit
            end = start + limit
            return collections[start:end], total
        except Exception as e:
            raise AppException(
                error_code=5002,
                message="Failed to retrieve public collections",
                status_code=500,
                details={"error": str(e)},
            )

    def get_collection_by_id(self, collection_id: int, user_id: int) -> Collection:
        try:
            collection = self.repository.get_by_id(collection_id)
            if collection.owner_id != user_id and not collection.is_public:
                raise ForbiddenError(
                    "You do not have access to this collection")
            return collection
        except NoResultFound:
            raise ResourceNotFoundError("Collection", collection_id)

    def update_collection_area(self, collection_id: int, is_public: bool, user_id: int) -> bool:
        try:
            collection = self.repository.get_by_id(collection_id)
            if collection.owner_id != user_id:
                raise ForbiddenError(
                    "You do not have permission to update this collection")
            collection.is_public = is_public
            self.repository.update(collection)
            return True
        except NoResultFound:
            raise ResourceNotFoundError("Collection", collection_id)
        except Exception as e:
            raise AppException(
                error_code=5003,
                message="Failed to update collection",
                status_code=500,
                details={"error": str(e)},
            )

    def update_collection(self, collection_id: int, data: CollectionUpdate, user_id: int) -> Collection:
        try:
            collection = self.repository.get_by_id(collection_id)
            if collection.owner_id != user_id:
                raise ForbiddenError(
                    "You do not have permission to update this collection")
            for field, value in data.model_dump(exclude_unset=True).items():
                setattr(collection, field, value)
            self.repository.update(collection)
            if data.album_ids is not None:
                self.repository.remove_albums(
                    collection, [a.id for a in collection.albums])
                self.repository.add_albums(collection, data.album_ids)
            if data.artist_ids is not None:
                self.repository.remove_artists(
                    collection, [a.id for a in collection.artists])
                self.repository.add_artists(collection, data.artist_ids)
            return collection
        except NoResultFound:
            raise ResourceNotFoundError("Collection", collection_id)
        except IntegrityError:
            raise DuplicateFieldError("name", data.name if data.name else "")
        except Exception as e:
            raise AppException(
                error_code=5003,
                message="Failed to update collection",
                status_code=500,
                details={"error": str(e)},
            )

    def delete_collection(self, collection_id: int, user_id: int) -> bool:
        try:
            collection = self.repository.get_by_id(collection_id)
            if collection.owner_id != user_id:
                raise ForbiddenError(
                    "You do not have permission to delete this collection")
            self.repository.delete(collection)
            return True
        except NoResultFound:
            raise ResourceNotFoundError("Collection", collection_id)

    def remove_album_from_collection(self, collection_id: int, album_id: int, user_id: int) -> bool:
        try:
            collection = self.repository.get_by_id(collection_id)
            if collection.owner_id != user_id:
                raise ForbiddenError(
                    "You do not have permission to modify this collection")
            self.repository.remove_albums(collection, [album_id])
            return True
        except NoResultFound:
            raise ResourceNotFoundError("Collection", collection_id)

    def remove_artist_from_collection(self, collection_id: int, artist_id: int, user_id: int) -> bool:
        try:
            collection = self.repository.get_by_id(collection_id)
            if collection.owner_id != user_id:
                raise ForbiddenError(
                    "You do not have permission to modify this collection")
            self.repository.remove_artists(collection, [artist_id])
            return True
        except NoResultFound:
            raise ResourceNotFoundError("Collection", collection_id)


def like_collection(self, collection_id: int, user_id: int) -> dict:
    collection = self.repository.get_by_id(collection_id)
    if not collection.is_public and collection.owner_id != user_id:
        raise ForbiddenError("You cannot like this collection")

    existing_like = self.like_repository.get(user_id, collection_id)
    if existing_like:
        # Already liked, do nothing, but return current status
        likes_count = self.like_repository.count_likes(collection_id)
        last_liked_at = existing_like.created_at if existing_like else None
        return {
            "collection_id": collection_id,
            "liked": True,
            "likes_count": likes_count,
            "last_liked_at": last_liked_at,
        }

    # Add the like
    new_like = self.like_repository.add(user_id, collection_id)
    likes_count = self.like_repository.count_likes(collection_id)
    last_liked_at = new_like.created_at if new_like else datetime.utcnow()
    return {
        "collection_id": collection_id,
        "liked": True,
        "likes_count": likes_count,
        "last_liked_at": last_liked_at,
    }


def unlike_collection(self, collection_id: int, user_id: int) -> dict:
    collection = self.repository.get_by_id(collection_id)
    if not collection.is_public and collection.owner_id != user_id:
        raise ForbiddenError("You cannot unlike this collection")
    # Not liked, return current status
    existing_like = self.like_repository.get(user_id, collection_id)
    if not existing_like:
        # Not liked, return current status
        likes_count = self.like_repository.count_likes(collection_id)
        return {
            "collection_id": collection_id,
            "liked": False,
            "likes_count": likes_count,
            "last_liked_at": None,
        }
    # Remove the like
    self.like_repository.remove(user_id, collection_id)
    likes_count = self.like_repository.count_likes(collection_id)
    return {
        "collection_id": collection_id,
        "liked": False,
        "likes_count": likes_count,
        "last_liked_at": None,
    }
