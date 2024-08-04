from sqlalchemy.orm import Session
from datetime import datetime
import pytz
from app.db.models import User as UserModel
from app.schemas.user import UserCreate, UserUpdate, User
from app.utils.utils import hash_password, verify_password
from app.repositories.user_repository import create_user as create_user_repo, get_user_by_id as repo_get_user_by_id, \
    get_user_by_email as repo_get_user_by_email


def get_user_by_id(db: Session, user_id: int):
    return repo_get_user_by_id(db, user_id)


def get_user_by_email(db: Session, email: str):
    return repo_get_user_by_email(db, email)


def get_users(db: Session, skip: int = 0, limit: int = 10):
    return db.query(UserModel).offset(skip).limit(limit).all()


def create_user(db: Session, user: UserCreate) -> User:
    user.password = hash_password(user.password)
    db_user = create_user_repo(db, user)
    return User.model_validate(db_user)


def update_user(db: Session, user_id: int, user: UserUpdate) -> User:
    db_user = repo_get_user_by_id(db, user_id)
    if db_user is None:
        return None
    db_user.email = user.email
    db_user.username = user.username
    if user.password:
        db_user.password = hash_password(user.password)
    db_user.timezone = user.timezone
    db.commit()
    db.refresh(db_user)
    return User.model_validate(db_user)


def delete_user(db: Session, user_id: int):
    db_user = repo_get_user_by_id(db, user_id)
    if db_user is None:
        return False
    db.delete(db_user)
    db.commit()
    return True


def authenticate_user(db: Session, email: str, password: str):
    user = repo_get_user_by_email(db, email)
    if not user or not verify_password(password, user.password):
        return None
    user.last_login = datetime.now(pytz.timezone(user.timezone))
    db.commit()
    return user
