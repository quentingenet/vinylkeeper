from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.db.models import User as UserModel
from app.schemas.user import UserCreate, UserUpdate
from app.core.config import settings
from app.utils.utils import hash_password, verify_password, create_access_token


def get_user_by_id(db: Session, user_id: int):
    return db.query(UserModel).filter(UserModel.id == user_id).first()


def get_user_by_username(db: Session, username: str):
    return db.query(UserModel).filter(UserModel.username == username).first()


def get_users(db: Session, skip: int = 0, limit: int = 10):
    return db.query(UserModel).offset(skip).limit(limit).all()


def create_user(db: Session, user: UserCreate):
    db_user = UserModel(
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        hashed_password=hash_password(user.password),
        is_active=True,
        is_superuser=False,
        registered_at=datetime.utcnow()
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def update_user(db: Session, user_id: int, user: UserUpdate):
    db_user = get_user_by_id(db, user_id)
    if db_user is None:
        return None
    db_user.email = user.email
    db_user.full_name = user.full_name
    db_user.hashed_password = hash_password(user.password)
    db.commit()
    db.refresh(db_user)
    return db_user


def delete_user(db: Session, user_id: int):
    db_user = get_user_by_id(db, user_id)
    if db_user is None:
        return False
    db.delete(db_user)
    db.commit()
    return True


def authenticate_user(db: Session, username: str, password: str):
    user = get_user_by_username(db, username)
    if not user or not verify_password(password, user.hashed_password):
        return None
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": user.username}, expires_delta=access_token_expires)
    user.last_login = datetime.utcnow()
    db.commit()
    return access_token
