from datetime import datetime
from sqlalchemy.orm import Session
from vinylkeeper_back.models.user_model import User
from typing import Optional
from uuid import UUID

def create_user(db: Session, user_data: dict) -> User:
    db_user = User(**user_data)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()

def get_user_by_uuid(db: Session, uuid: str) -> Optional[User]:
    try:
        uuid_obj = UUID(uuid)
    except ValueError:
        return None
    return db.query(User).filter(User.user_uuid == uuid_obj).first()

def update_user_last_login(db: Session, user_id: int):
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.last_login = datetime.now()
        db.commit()
        db.refresh(user)

def update_user_password(db: Session, user_id: int, new_password: str):
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.password = new_password
        db.commit()
        db.refresh(user)
