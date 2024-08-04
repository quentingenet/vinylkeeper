import pytz
from sqlalchemy.orm import Session
from datetime import datetime
from app.db.models import User as UserModel
from app.schemas.user import UserCreate, User


def get_user_by_id(db: Session, user_id: int):
    return db.query(UserModel).filter(UserModel.id == user_id).first()


def get_user_by_email(db: Session, email: str):
    return db.query(UserModel).filter(UserModel.email == email).first()


def create_user(db: Session, user: UserCreate):
    db_user = UserModel(
        username=user.username,
        email=user.email,
        password=user.password,
        is_accepted_terms=user.is_accepted_terms,
        is_active=True,
        is_superuser=False,
        last_login=datetime.now(pytz.timezone(user.timezone)),
        registered_at=datetime.now(pytz.timezone(user.timezone)),
        timezone=user.timezone
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return User.model_validate(db_user)


def update_user(db: Session, user_id: int, user: UserCreate):
    db_user = get_user_by_id(db, user_id)
    if not db_user:
        return None
    db_user.username = user.username
    db_user.email = user.email
    db_user.password = user.password
    db_user.timezone = user.timezone
    db.commit()
    db.refresh(db_user)
    return User.model_validate(db_user)


def delete_user(db: Session, user_id: int):
    db_user = get_user_by_id(db, user_id)
    if not db_user:
        return False
    db.delete(db_user)
    db.commit()
    return True
