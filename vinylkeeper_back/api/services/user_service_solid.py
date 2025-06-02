from typing import Optional, Dict, Any
from fastapi import BackgroundTasks, HTTPException
from api.repositories.interfaces import IUserRepository
from api.models.user_model import User
from api.schemas.user_schemas import CreateUser
from api.core.logging import logger
from api.utils.auth_utils.auth import TokenType, create_token, create_reset_token, verify_reset_token
from api.mails.client_mail import MailSubject, send_mail
from api.core.config_env import Settings
from api.core.security import hash_password
from api.services.encryption_service import encryption_service
import re
import uuid
import base64


class AuthError(Exception):
    """Custom exception for authentication errors"""
    pass


class UserService:
    """SOLID User Service - Business Logic Layer"""
    
    def __init__(self, user_repo: IUserRepository):
        self.user_repo = user_repo
    
    def _is_encrypted_password(self, password: str) -> bool:
        """Check if password is encrypted (base64) or plain text"""
        # Encrypted passwords are base64 and much longer than typical passwords
        try:
            if len(password) > 100:  # Encrypted passwords are much longer
                base64.b64decode(password)  # Test if valid base64
                return True
        except:
            pass
        return False
    
    def _decrypt_password(self, password: str) -> str:
        """Decrypt password if encrypted, or return as-is if plain text"""
        if not self._is_encrypted_password(password):
            logger.info("🔐 Password received in plain text (fallback mode)")
            return password
        
        try:
            decrypted = encryption_service.decrypt_password(password)
            logger.info("🔐 Password successfully decrypted")
            return decrypted
        except ValueError as e:
            logger.error(f"Password decryption failed: {str(e)}")
            raise AuthError("Invalid password format")
    
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
        
        # Decrypt password first (or keep as-is if plain text)
        password_input = user_data.get("password", "")
        if not password_input:
            raise AuthError("Password is required")
        
        try:
            decrypted_password = self._decrypt_password(password_input)
            user_data["password"] = decrypted_password
        except AuthError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error during password processing: {str(e)}")
            raise AuthError("Password processing failed")
        
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
        
        # Generate UUID for new user (as UUID object, not string)
        generated_uuid = uuid.uuid4()
        user_data["user_uuid"] = generated_uuid
        
        # Set default role if not provided
        if "role_id" not in user_data:
            user_data["role_id"] = Settings().DEFAULT_ROLE_ID
        
        # Create user
        user = self.user_repo.create_user(user_data)
        if not user:
            raise AuthError("Failed to create user")
        
        return user
    
    def authenticate_user(self, email: str, password_input: str) -> User:
        """Authenticate user with business validation"""
        
        # Business rule: Validate input
        if not email or not password_input:
            raise AuthError("Email and password are required")
        
        # Business rule: Validate email format
        if not self._validate_email(email):
            raise AuthError("Invalid email format")
        
        # Decrypt password (or keep as-is if plain text)
        try:
            password = self._decrypt_password(password_input)
        except AuthError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error during password processing: {str(e)}")
            raise AuthError("Password processing failed")
        
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
        reset_token = create_reset_token(str(user.user_uuid))
        
        # Send email (business logic: send in background)
        background_tasks.add_task(
            send_mail,
            user.email,
            MailSubject.PasswordReset,
            token=reset_token
        )
        
        logger.info(f"Password reset email sent to {email}")
        return True
    
    def reset_password(self, token: str, password_input: str) -> bool:
        """Reset user password with token validation"""
        
        # Decrypt password first (or keep as-is if plain text)
        try:
            new_password = self._decrypt_password(password_input)
        except AuthError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error during password processing: {str(e)}")
            raise AuthError("Password processing failed")
        
        # Business rule: Validate new password
        if not self._validate_password(new_password):
            raise AuthError("Password must be at least 6 characters long")
        
        # Business rule: Validate token
        if not token:
            raise AuthError("Invalid reset token")
        
        try:
            # Verify and extract user UUID from reset token
            user_uuid = verify_reset_token(token)
        except ValueError as e:
            logger.error(f"Token validation failed: {str(e)}")
            raise AuthError("Invalid or expired reset token")
        
        # Get user by UUID
        user = self.user_repo.get_user_by_uuid(user_uuid)
        if not user:
            logger.error(f"User not found with UUID: {user_uuid}")
            raise AuthError("User not found")
        
        # Hash new password
        hashed_password = hash_password(new_password)
        
        # Update password in database
        success = self.user_repo.update_user_password(user.id, hashed_password)
        if not success:
            logger.error(f"Failed to update password for user {user.id}")
            raise AuthError("Failed to update password")
        
        logger.info(f"Password successfully reset for user {user.username} (ID: {user.id})")
        return True 