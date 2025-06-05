from sqlalchemy.orm import Session
from app.models.user_model import User
from typing import Optional, List
from app.core.exceptions import ServerError


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_user_by_email(self, email: str) -> Optional[User]:
        """Get a user by email"""
        try:
            return self.db.query(User).filter(User.email == email).first()
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to get user by email",
                details={"error": str(e)}
            )

    def get_user_by_id(self, user_id: int) -> Optional[User]:
        """Get a user by id"""
        try:
            return self.db.query(User).filter(User.id == user_id).first()
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to get user by id",
                details={"error": str(e)}
            )

    def get_user_by_uuid(self, user_uuid: str) -> Optional[User]:
        """Get a user by UUID"""
        try:
            return self.db.query(User).filter(User.user_uuid == user_uuid).first()
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to get user by uuid",
                details={"error": str(e)}
            )

    def create_user(self, user: User) -> User:
        """Create a new user"""
        try:
            self.db.add(user)
            self.db.commit()
            self.db.refresh(user)
            return user
        except Exception as e:
            self.db.rollback()
            raise ServerError(
                error_code=5000,
                message="Failed to create user",
                details={"error": str(e)}
            )

    def update_user(self, user: User) -> User:
        """Update a user"""
        try:
            self.db.add(user)
            self.db.commit()
            self.db.refresh(user)
            return user
        except Exception as e:
            self.db.rollback()
            raise ServerError(
                error_code=5000,
                message="Failed to update user",
                details={"error": str(e)}
            )

    def update_user_last_login(self, user: User) -> User:
        """Update user's number of connections and last login"""
        try:
            self.db.add(user)
            self.db.commit()
            self.db.refresh(user)
            return user
        except Exception as e:
            self.db.rollback()
            raise ServerError(
                error_code=5000,
                message="Failed to update user last login",
                details={"error": str(e)}
            )

    def update_user_password(self, user_id: int, hashed_password: str) -> bool:
        """Update user's password"""
        try:
            user = self.get_user_by_id(user_id)
            if not user:
                return False

            user.password = hashed_password
            self.db.add(user)
            self.db.commit()
            return True
        except Exception as e:
            self.db.rollback()
            raise ServerError(
                error_code=5000,
                message="Failed to update user password",
                details={"error": str(e)}
            )

    def delete_user(self, user_id: int) -> bool:
        """Delete a user"""
        try:
            user = self.get_user_by_id(user_id)
            if not user:
                return False

            self.db.delete(user)
            self.db.commit()
            return True
        except Exception as e:
            self.db.rollback()
            raise ServerError(
                error_code=5000,
                message="Failed to delete user",
                details={"error": str(e)}
            )

    def is_email_taken(self, email: str) -> bool:
        """Check if email is already taken"""
        try:
            return self.get_user_by_email(email) is not None
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to check if email is taken",
                details={"error": str(e)}
            )

    def is_username_taken(self, username: str) -> bool:
        """Check if username is already taken"""
        try:
            return self.db.query(User).filter(User.username == username).first() is not None
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to check if username is taken",
                details={"error": str(e)}
            )

    def get_all_users(self, skip: int = 0, limit: int = 100) -> List[User]:
        """Get all users with pagination"""
        try:
            return self.db.query(User).offset(skip).limit(limit).all()
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to get all users",
                details={"error": str(e)}
            )

    def count_users(self) -> int:
        """Count total number of users"""
        try:
            return self.db.query(User).count()
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to count users",
                details={"error": str(e)}
            )
