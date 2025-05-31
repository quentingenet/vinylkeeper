from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_
from api.repositories.interfaces import IUserRepository
from api.models.user_model import User
from api.core.logging import logger
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

ph = PasswordHasher()

class UserRepository(IUserRepository):
    """SOLID implementation of User Repository"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_user(self, user_data: dict) -> Optional[User]:
        """Create a new user"""
        try:
            logger.info(f"🔧 REPO DEBUG: Received user_data: {user_data}")
            
            # Hash password before storing
            hashed_password = ph.hash(user_data["password"])
            
            logger.info(f"🔧 REPO DEBUG: After password hash, user_data: {user_data}")
            
            new_user = User(
                username=user_data["username"],
                email=user_data["email"],
                password=hashed_password,
                user_uuid=user_data.get("user_uuid"),
                is_accepted_terms=user_data.get("is_accepted_terms", False),
                is_active=user_data.get("is_active", True),
                is_superuser=user_data.get("is_superuser", False),
                timezone=user_data.get("timezone", "UTC+1"),
                role_id=user_data.get("role_id", 2)  # Default role
            )
            
            logger.info(f"🔧 REPO DEBUG: Created new_user object: {new_user.__dict__}")
            
            self.db.add(new_user)
            self.db.commit()
            self.db.refresh(new_user)
            
            logger.info(f"User created: {new_user.username} - {new_user.email}")
            return new_user
            
        except Exception as e:
            logger.error(f"Error creating user: {str(e)}")
            self.db.rollback()
            return None
    
    def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        try:
            user = self.db.query(User).filter(User.email == email).first()
            return user
        except Exception as e:
            logger.error(f"Error fetching user by email: {str(e)}")
            return None
    
    def get_user_by_uuid(self, user_uuid: str) -> Optional[User]:
        """Get user by UUID"""
        try:
            user = self.db.query(User).filter(User.user_uuid == user_uuid).first()
            return user
        except Exception as e:
            logger.error(f"Error fetching user by UUID: {str(e)}")
            return None
    
    def update_user_password(self, user_id: int, hashed_password: str) -> bool:
        """Update user password"""
        try:
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                return False
            
            user.password = hashed_password
            self.db.commit()
            
            logger.info(f"Password updated for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating user password: {str(e)}")
            self.db.rollback()
            return False
    
    def verify_user_credentials(self, email: str, password: str) -> Optional[User]:
        """Verify user credentials"""
        try:
            user = self.db.query(User).filter(User.email == email).first()
            
            if not user:
                return None
            
            # Verify password directly with Argon2
            try:
                ph.verify(user.password, password)
                return user
            except VerifyMismatchError:
                return None
            
        except Exception as e:
            logger.error(f"Error verifying credentials: {str(e)}")
            return None 