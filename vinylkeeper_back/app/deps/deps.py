from fastapi import Depends
from sqlalchemy.orm import Session
from app.services.user_service import UserService
from app.repositories.user_repository import UserRepository
from app.db.session import get_db


def get_user_service(db: Session = Depends(get_db)) -> UserService:
    return UserService(UserRepository(db))
