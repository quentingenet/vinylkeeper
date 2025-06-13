from fastapi import Depends
from sqlalchemy.orm import Session
from app.services.user_service import UserService
from app.repositories.user_repository import UserRepository
from app.db.session import get_db
from app.services.collection_service import CollectionService
from app.services.search_service import SearchService


def get_user_service(db: Session = Depends(get_db)) -> UserService:
    return UserService(UserRepository(db))


def get_collection_service(db: Session = Depends(get_db)) -> CollectionService:
    return CollectionService(db)


def get_search_service(db: Session = Depends(get_db)) -> SearchService:
    return SearchService(db)
