from sqlalchemy.orm import Session
from app.models.user_model import User
from app.schemas.user_schema import UserCreate
from typing import Optional


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_user_by_email(self, email: str) -> Optional[User]:
        """Get a user by email"""
        return self.db.query(User).filter(User.email == email).first()

    def get_user_by_id(self, user_id: int) -> Optional[User]:
        """Get a user by id"""
        return self.db.query(User).filter(User.id == user_id).first()

    def get_user_by_uuid(self, user_uuid: str) -> Optional[User]:
        """Get a user by UUID"""
        return self.db.query(User).filter(User.user_uuid == user_uuid).first()

    def create_user(self, user: User) -> User:
        """Create a new user"""
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def update_user(self, user: User) -> User:
        """Update a user"""
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def update_number_of_connections(self, user: User) -> User:
        """Update user's number of connections"""
        user.number_of_connections += 1
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def update_user_password(self, user_id: int, hashed_password: str) -> bool:
        """Update user's password"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return False

        user.password = hashed_password
        self.db.add(user)
        self.db.commit()
        return True

    def delete_user(self, user_id: int) -> bool:
        """Delete a user"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return False

        self.db.delete(user)
        self.db.commit()
        return True

    def is_email_taken(self, email: str) -> bool:
        """Check if email is already taken"""
        return self.db.query(User).filter(User.email == email).first() is not None

    def is_username_taken(self, username: str) -> bool:
        """Check if username is already taken"""
        return self.db.query(User).filter(User.username == username).first() is not None
