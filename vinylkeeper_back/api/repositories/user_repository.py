from datetime import datetime
from sqlalchemy.orm import Session
from api.models.user_model import User
from typing import Optional
from uuid import UUID

class UserRepository:
    
    def __init__(self, db: Session):
        self.db = db

    def create_user(self, user_data: dict) -> User:
        db_user = User(**user_data)
        self.db.add(db_user)
        self.db.commit()
        self.db.refresh(db_user)
        return db_user

    def get_user_by_email(self, email: str) -> Optional[User]:
        return self.db.query(User).filter(User.email == email).first()

    def get_user_by_uuid(self, uuid: str) -> Optional[User]:
        try:
            uuid_obj = UUID(uuid, version=4)
        except ValueError:
            return None
        return self.db.query(User).filter(User.user_uuid == uuid_obj).first()

    def update_user_last_login(self, user_id: int):
        user = self.db.query(User).filter(User.id == user_id).first()
        if user:
            user.last_login = datetime.now()
            self.db.commit()
            self.db.refresh(user)

    def update_user_password(self, user_id: int, new_password: str):
        user = self.db.query(User).filter(User.id == user_id).first()
        if user:
            user.password = new_password
            self.db.commit()
            self.db.refresh(user)
