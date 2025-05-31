from typing import Optional, Dict, Any
from fastapi import BackgroundTasks, HTTPException
from api.repositories.interfaces import IUserRepository
from api.models.user_model import User
from api.schemas.user_schemas import CreateUser
from api.core.logging import logger
from api.utils.auth_utils.auth import TokenType, create_token
from api.mails.client_mail import MailSubject, send_mail
from api.core.config_env import Settings
from passlib.context import CryptContext
import re

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthError(Exception):
    """Custom exception for authentication errors"""
    pass


class UserService:
    """SOLID User Service - Business Logic Layer"""
    
    def __init__(self, user_repo: IUserRepository):
        self.user_repo = user_repo
    
    def _validate_email(self, email: str) -> bool:
        """Validate email format"""
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(email_pattern, email) is not None
    
    def _validate_password(self, password: str) -> bool:
        """Validate password strength"""
        if len(password) < 6:
            return False
        return True
    
    def _validate_username(self, username: str) -> bool:
        """Validate username"""
        if not username or len(username.strip()) < 2:
            return False
        return True
    
    def register_user(self, user_data: dict) -> User:
        """Register a new user with business validation"""
        
        # Business rule: Validate email format
        if not self._validate_email(user_data.get("email", "")):
            raise AuthError("Invalid email format")
        
        # Business rule: Validate password strength
        if not self._validate_password(user_data.get("password", "")):
            raise AuthError("Password must be at least 6 characters long")
        
        # Business rule: Validate username
        if not self._validate_username(user_data.get("username", "")):
            raise AuthError("Username must be at least 2 characters long")
        
        # Business rule: Check if email already exists
        existing_user = self.user_repo.get_user_by_email(user_data["email"])
        if existing_user:
            raise AuthError("Email already registered")
        
        # Create user
        user = self.user_repo.create_user(user_data)
        if not user:
            raise AuthError("Failed to create user")
        
        return user
    
    def authenticate_user(self, email: str, password: str) -> User:
        """Authenticate user with business validation"""
        
        # Business rule: Validate input
        if not email or not password:
            raise AuthError("Email and password are required")
        
        # Business rule: Validate email format
        if not self._validate_email(email):
            raise AuthError("Invalid email format")
        
        # Verify credentials
        user = self.user_repo.verify_user_credentials(email, password)
        if not user:
            raise AuthError("Invalid email or password")
        
        return user
    
    def get_user_by_uuid(self, user_uuid: str) -> Optional[User]:
        """Get user by UUID"""
        if not user_uuid:
            return None
        
        return self.user_repo.get_user_by_uuid(user_uuid)
    
    def send_password_reset_email(self, email: str, background_tasks: BackgroundTasks) -> bool:
        """Send password reset email"""
        
        # Business rule: Validate email format
        if not self._validate_email(email):
            raise AuthError("Invalid email format")
        
        # Business rule: Check if user exists
        user = self.user_repo.get_user_by_email(email)
        if not user:
            raise AuthError("Email not found")
        
        # Generate reset token
        reset_token = create_token(str(user.user_uuid), TokenType.REFRESH)
        
        # Send email (business logic: send in background)
        background_tasks.add_task(
            send_mail,
            Settings().EMAIL_ADMIN,
            MailSubject.PasswordReset,
            username=user.username,
            reset_token=reset_token,
            user_email=user.email
        )
        
        logger.info(f"Password reset email sent to {email}")
        return True
    
    def reset_password(self, token: str, new_password: str) -> bool:
        """Reset user password with token validation"""
        
        # Business rule: Validate new password
        if not self._validate_password(new_password):
            raise AuthError("Password must be at least 6 characters long")
        
        # Business rule: Validate token (simplified - in real app, verify JWT)
        if not token:
            raise AuthError("Invalid reset token")
        
        # Hash new password
        hashed_password = pwd_context.hash(new_password)
        
        # Business rule: Update password (simplified - in real app, extract user from token)
        # For now, this is a placeholder implementation
        logger.info("Password reset functionality needs JWT token validation")
        raise AuthError("Password reset functionality not fully implemented")
        
        # TODO: Implement proper JWT token validation and user identification
        # user_uuid = verify_reset_token(token)
        # user = self.user_repo.get_user_by_uuid(user_uuid)
        # return self.user_repo.update_user_password(user.id, hashed_password) 