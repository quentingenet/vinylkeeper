from sqlalchemy.orm import Session
from app.db import models
from app.schemas import user as user_schema


def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()


def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()


def create_user(db: Session, user: user_schema.UserCreate):
    db_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=user.hashed_password,
        is_active=True,
        is_superuser=False
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user
