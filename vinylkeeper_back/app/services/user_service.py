from sqlalchemy.orm import Session
from app.db.models import User as UserModel
from app.schemas.user import UserCreate

def get_user_by_id(db: Session, user_id: int):
    return db.query(UserModel).filter(UserModel.id == user_id).first()

def get_users(db: Session, skip: int = 0, limit: int = 10):
    return db.query(UserModel).offset(skip).limit(limit).all()

def create_user(db: Session, user: UserCreate):
    db_user = UserModel(email=user.email, full_name=user.full_name, hashed_password=user.password)  # Password hashing to be added
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db: Session, user_id: int, user: UserCreate):
    db_user = get_user_by_id(db, user_id)
    if db_user is None:
        return None
    db_user.email = user.email
    db_user.full_name = user.full_name
    db_user.hashed_password = user.password  # Password hashing to be added
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
