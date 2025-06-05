import datetime
from app.repositories.user_repository import UserRepository
from app.core.security import verify_password, hash_password
from app.utils.auth_utils.auth import create_reset_token, verify_reset_token
from app.models.user_model import User
from app.schemas.user_schema import (
    UserCreate,
    UserUpdate,
    UserResponse,
    UserMiniResponse,
    ContactMessageRequest,
    ContactMessageResponse
)
import uuid
from app.mails.client_mail import send_mail, send_mail_sync, MailSubject
from app.core.exceptions import (
    ErrorCode,
    InvalidCredentialsError,
    ResourceNotFoundError,
    EmailNotFoundError,
    PasswordUpdateError,
    UserNotFoundError,
    DuplicateEmailError,
    DuplicateUsernameError,
    ServerError
)
from app.services.collection_service import CollectionService
from app.schemas.collection_schema import CollectionCreate
from typing import List, Tuple
from app.core.config_env import settings
import logging

logger = logging.getLogger(__name__)


class UserService:
    def __init__(self, repository: UserRepository, collection_service: CollectionService):
        self.repository = repository
        self.collection_service = collection_service

    def authenticate(self, email: str, password: str) -> User:
        """Authenticate a user with email and password"""
        try:
            user = self.repository.get_user_by_email(email)
            if not user:
                raise EmailNotFoundError(email)

            if not verify_password(user.password, password):
                raise InvalidCredentialsError()

            user.number_of_connections += 1
            user.last_login = datetime.datetime.now(datetime.timezone.utc)

            self.repository.update_user_last_login(user)
            return user
        except (EmailNotFoundError, InvalidCredentialsError):
            # Let these authentication exceptions bubble up with their details
            raise
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Authentication failed",
                details={"error": str(e)}
            )

    def get_user_by_id(self, user_id: int) -> User:
        """Get a user by ID"""
        try:
            user = self.repository.get_user_by_id(user_id)
            if not user:
                raise ResourceNotFoundError("User", user_id)
            return user
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to get user",
                details={"error": str(e)}
            )

    def get_user_with_counts(self, user_id: int) -> dict:
        """Get a user by ID with calculated counts and dates"""
        try:
            user = self.repository.get_user_by_id(user_id)
            if not user:
                raise ResourceNotFoundError("User", user_id)
            
            # Calculate counts
            collections_count = len(user.collections)
            liked_collections_count = len(user.likes)
            loans_count = len(user.loans)
            wishlist_items_count = len(user.wishlist_items)
            
            # Determine terms_accepted_at date
            terms_accepted_at = user.created_at if user.is_accepted_terms else None
            
            return {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "user_uuid": user.user_uuid,
                "role": user.role,
                "is_accepted_terms": user.is_accepted_terms,
                "is_active": user.is_active,
                "is_superuser": user.is_superuser,
                "last_login": user.last_login,
                "created_at": user.created_at,
                "timezone": user.timezone,
                "number_of_connections": user.number_of_connections,
                "role_id": user.role_id,
                "collections_count": collections_count,
                "liked_collections_count": liked_collections_count,
                "loans_count": loans_count,
                "wishlist_items_count": wishlist_items_count,
                "terms_accepted_at": terms_accepted_at
            }
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to get user with counts",
                details={"error": str(e)}
            )

    def get_user_by_uuid(self, user_uuid: str) -> User:
        """Get a user by UUID"""
        try:
            user = self.repository.get_user_by_uuid(user_uuid)
            if not user:
                raise UserNotFoundError(user_uuid)
            return user
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to get user",
                details={"error": str(e)}
            )

    def create_user(self, user_data: UserCreate) -> User:
        """Create a new user with initial collection"""
        try:
            if self.repository.is_email_taken(user_data.email):
                raise DuplicateEmailError(user_data.email)

            if self.repository.is_username_taken(user_data.username):
                raise DuplicateUsernameError(user_data.username)

            user = User(
                user_uuid=uuid.uuid4(),
                username=user_data.username,
                email=user_data.email,
                password=hash_password(user_data.password),
                role_id=user_data.role_id if user_data.role_id else settings.DEFAULT_ROLE_ID,
                is_accepted_terms=user_data.is_accepted_terms,
                timezone=user_data.timezone
            )

            # Create user
            created_user = self.repository.create_user(user)

            # Create initial collection
            first_collection = CollectionCreate(
                name=f"{created_user.username}'s collection",
                description=f"My first collection",
                is_public=False,
                owner_id=created_user.id,
            )
            self.collection_service.create_collection(
                collection_data=first_collection,
                user_id=created_user.id
            )

            return created_user
        except (DuplicateEmailError, DuplicateUsernameError):
            # Let these exceptions bubble up with their details
            raise
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to create user",
                details={"error": str(e)}
            )

    def update_user(self, user_id: int, user_data: UserUpdate) -> User:
        """Update user information"""
        try:
            user = self.get_user_by_id(user_id)

            if user_data.email and user_data.email != user.email:
                if self.repository.is_email_taken(user_data.email):
                    raise DuplicateEmailError(user_data.email)

            if user_data.username and user_data.username != user.username:
                if self.repository.is_username_taken(user_data.username):
                    raise DuplicateUsernameError(user_data.username)

            update_data = user_data.model_dump(exclude_unset=True)
            for key, value in update_data.items():
                setattr(user, key, value)

            return self.repository.update_user(user)
        except (DuplicateEmailError, DuplicateUsernameError):
            # Let these exceptions bubble up with their details
            raise
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to update user",
                details={"error": str(e)}
            )

    def send_password_reset_email(self, email: str) -> None:
        """Send password reset email"""
        try:
            user = self.repository.get_user_by_email(email)
            if not user:
                return

            # Send password reset email
            reset_token = create_reset_token(str(user.user_uuid))
            email_sent = send_mail_sync(
                to=user.email,
                subject=MailSubject.PasswordReset,
                token=reset_token
            )
            if not email_sent:
                logger.error(f"Failed to send password reset email to {user.email}")
            else:
                logger.info(f"Password reset email sent to {user.email}")
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to send password reset email",
                details={"error": str(e)}
            )

    def reset_password(self, token: str, new_password: str) -> None:
        """Reset user password"""
        try:
            user_uuid = verify_reset_token(token)
            user = self.repository.get_user_by_uuid(user_uuid)
            if not user:
                raise UserNotFoundError(user_uuid)

            hashed_password = hash_password(new_password)
            success = self.repository.update_user_password(
                user.id, hashed_password)
            if not success:
                raise PasswordUpdateError()
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to reset password",
                details={"error": str(e)}
            )

    def change_password(self, user_id: int, current_password: str, new_password: str) -> None:
        """Change user password"""
        try:
            user = self.get_user_by_id(user_id)
            if not verify_password(user.password, current_password):
                raise InvalidCredentialsError()
            hashed_password = hash_password(new_password)
            success = self.repository.update_user_password(user_id, hashed_password)
            if not success:
                raise PasswordUpdateError()
        except (InvalidCredentialsError, PasswordUpdateError):
            raise
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to change password",
                details={"error": str(e)}
            )

    def send_new_user_registered_email(self, user: User) -> None:
        """Send new user registered email to ADMIN"""
        try:
            # Use synchronous version instead of background task
            email_sent = send_mail_sync(
                to=settings.EMAIL_ADMIN,
                subject=MailSubject.NewUserRegistered,
                username=user.username,
                user_email=user.email
            )
            if not email_sent:
                logger.error(f"Failed to send new user registered email to {settings.EMAIL_ADMIN}")
            else:
                logger.info(f"New user {user.username} registered email sent to {settings.EMAIL_ADMIN}")
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to send new user registered email",
                details={"error": str(e)}
            )

    def get_all_users(self, skip: int = 0, limit: int = 100) -> Tuple[List[User], int]:
        """Get all users with pagination"""
        try:
            users = self.repository.get_all_users(skip, limit)
            total = self.repository.count_users()
            return users, total
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to get users",
                details={"error": str(e)}
            )

    def delete_user(self, user_id: int) -> bool:
        """Delete a user"""
        try:
            return self.repository.delete_user(user_id)
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to delete user",
                details={"error": str(e)}
            )

    def get_user_me(self, user_id: int) -> dict:
        """Get user data for /me endpoint - secure version without sensitive data"""
        try:
            user = self.repository.get_user_by_id(user_id)
            if not user:
                raise ResourceNotFoundError("User", user_id)
            
            # Calculate counts
            collections_count = len(user.collections)
            liked_collections_count = len(user.likes)
            loans_count = len(user.loans)
            wishlist_items_count = len(user.wishlist_items)
            
            return {
                "username": user.username,
                "user_uuid": user.user_uuid,
                "collections_count": collections_count,
                "liked_collections_count": liked_collections_count,
                "loans_count": loans_count,
                "wishlist_items_count": wishlist_items_count
            }
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to get user me data",
                details={"error": str(e)}
            )

    def get_user_settings(self, user_id: int) -> dict:
        """Get user data for settings page - complete version with email and dates"""
        try:
            user = self.repository.get_user_by_id(user_id)
            if not user:
                raise ResourceNotFoundError("User", user_id)
            
            # Determine terms_accepted_at date
            terms_accepted_at = user.created_at if user.is_accepted_terms else None
            
            return {
                "username": user.username,
                "email": user.email,
                "user_uuid": user.user_uuid,
                "created_at": user.created_at,
                "terms_accepted_at": terms_accepted_at,
                "is_accepted_terms": user.is_accepted_terms
            }
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to get user settings data",
                details={"error": str(e)}
            )

    def update_password(self, user_id: int, new_password: str) -> bool:
        """Update user password"""
        try:
            user = self.repository.get_user_by_id(user_id)
            if not user:
                raise ResourceNotFoundError("User", user_id)
            
            # Hash the new password
            hashed_password = hash_password(new_password)
            
            # Update password
            success = self.repository.update_user_password(user_id, hashed_password)
            if not success:
                raise PasswordUpdateError()
            
            return True
            
        except (ResourceNotFoundError, PasswordUpdateError):
            raise
        except Exception as e:
            logger.error(f"Error updating password: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to update password",
                details={"error": str(e)}
            )

    def send_contact_message(self, user_uuid: str, message_data: ContactMessageRequest) -> ContactMessageResponse:
        """Send contact message from authenticated user"""
        try:
            # Get user information
            user = self.repository.get_user_by_uuid(user_uuid)
            if not user:
                raise ResourceNotFoundError("User", user_uuid)
            
            # Send email to admin
            logger.info(f"Attempting to send contact email to {settings.EMAIL_ADMIN}")
            email_sent = send_mail_sync(
                to=settings.EMAIL_ADMIN,
                subject=MailSubject.ContactMessage,
                username=user.username,
                email=user.email,
                user_id=user.id,
                subject_line=message_data.subject,
                message=message_data.message,
                sent_at=datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            )
            
            if not email_sent:
                raise ServerError(
                    error_code=5000,
                    message="Failed to send contact email",
                    details={"error": "Email sending failed"}
                )
        
            return ContactMessageResponse(
                message="Contact message sent successfully",
                sent_at=datetime.datetime.now()
            )
            
        except ResourceNotFoundError:
            raise
        except Exception as e:
            logger.error(f"Error sending contact message: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to send contact message",
                details={"error": str(e)}
            )
