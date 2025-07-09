from datetime import datetime, timezone
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
from app.mails.client_mail import send_mail, MailSubject
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
from typing import List, Optional, Tuple
from app.core.config_env import settings
import logging

logger = logging.getLogger(__name__)


class UserService:
    def __init__(self, repository: UserRepository, collection_service: CollectionService):
        self.repository = repository
        self.collection_service = collection_service

    async def authenticate(self, email: str, password: str) -> User:
        """Authenticate a user with email and password"""
        try:
            user = await self.repository.get_user_by_email(email)
            if not user:
                raise EmailNotFoundError(email)

            if not verify_password(user.password, password):
                raise InvalidCredentialsError()

            user.number_of_connections += 1
            user.last_login = datetime.now(timezone.utc)

            await self.repository.update_user_last_login(user)
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

    async def get_user_by_id(self, user_id: int) -> User:
        """Get a user by ID"""
        try:
            user = await self.repository.get_user_by_id(user_id)
            if not user:
                raise ResourceNotFoundError("User", user_id)
            return user
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to get user",
                details={"error": str(e)}
            )

    async def get_user_by_uuid(self, user_uuid: str) -> User:
        """Get a user by UUID"""
        try:
            user = await self.repository.get_user_by_uuid(user_uuid)
            if not user:
                raise UserNotFoundError(user_uuid)
            return user
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to get user",
                details={"error": str(e)}
            )

    async def create_user(self, user_data: UserCreate) -> User:
        """Create a new user with initial collection"""
        try:
            if await self.repository.is_email_taken(user_data.email):
                raise DuplicateEmailError(user_data.email)

            if await self.repository.is_username_taken(user_data.username):
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
            created_user = await self.repository.create_user(user)

            # Create initial collection
            first_collection = CollectionCreate(
                name=f"{created_user.username}'s collection",
                description=f"My first collection",
                is_public=False,
                owner_id=created_user.id,
            )
            await self.collection_service.create_collection(
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

    async def update_user(self, user: User, user_data: UserUpdate) -> User:
        """Update user information"""
        try:
            if user_data.email and user_data.email != user.email:
                if await self.repository.is_email_taken(user_data.email):
                    raise DuplicateEmailError(user_data.email)

            if user_data.username and user_data.username != user.username:
                if await self.repository.is_username_taken(user_data.username):
                    raise DuplicateUsernameError(user_data.username)

            update_data = user_data.model_dump(exclude_unset=True)
            for key, value in update_data.items():
                setattr(user, key, value)

            return await self.repository.update_user(user)
        except (DuplicateEmailError, DuplicateUsernameError):
            raise
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to update user",
                details={"error": str(e)}
            )

    async def send_password_reset_email(self, email: str) -> None:
        """Send password reset email"""
        try:
            user = await self.repository.get_user_by_email(email)
            if not user:
                return

            # Send password reset email
            reset_token = create_reset_token(str(user.user_uuid))
            email_sent = await send_mail(
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

    async def reset_password(self, token: str, new_password: str) -> None:
        """Reset user password"""
        try:
            user_uuid = verify_reset_token(token)
            user = await self.repository.get_user_by_uuid(user_uuid)
            if not user:
                raise UserNotFoundError(user_uuid)

            hashed_password = hash_password(new_password)
            success = await self.repository.update_user_password(user.id, hashed_password)
            if not success:
                raise PasswordUpdateError("Failed to update password")
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to reset password",
                details={"error": str(e)}
            )

    async def change_password(self, user: User, current_password: str, new_password: str) -> None:
        """Change user password"""
        try:
            if not verify_password(user.password, current_password):
                raise InvalidCredentialsError()

            hashed_password = hash_password(new_password)
            success = await self.repository.update_user_password(user.id, hashed_password)
            if not success:
                raise PasswordUpdateError("Failed to update password")
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to change password",
                details={"error": str(e)}
            )

    async def send_new_user_registered_email(self, user: User) -> None:
        """Send email to admin about new user registration"""
        try:
            email_sent = await send_mail(
                to=settings.EMAIL_ADMIN,
                subject=MailSubject.NewUserRegistered,
                username=user.username,
                user_email=user.email
            )
            if not email_sent:
                logger.error(f"Failed to send new user email to admin for user {user.username}")
            else:
                logger.info(f"New user email sent to admin for user {user.username}")
        except Exception as e:
            logger.error(f"Failed to send new user email: {str(e)}")

    async def get_all_users(self, skip: int = 0, limit: int = 100) -> Tuple[List[User], int]:
        """Get all users with pagination"""
        try:
            users = await self.repository.get_all_users(skip, limit)
            total_count = await self.repository.count_users()
            return users, total_count
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to get all users",
                details={"error": str(e)}
            )

    async def delete_user(self, user: User) -> bool:
        """Delete a user"""
        try:
            return await self.repository.delete_user(user.id)
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to delete user",
                details={"error": str(e)}
            )

    async def get_user_me(self, user: User) -> dict:
        """Get current user information with calculated counts"""
        try:
            # Get user collections count
            collections_count = await self.collection_service.get_user_collections_count(user.id)
            
            # Get user wishlist count
            wishlist_count = await self.collection_service.get_user_wishlist_count(user.id)
            
            # Get user likes count
            likes_count = await self.collection_service.get_user_likes_count(user.id)
            
            # Get user places count
            places_count = await self.collection_service.get_user_places_count(user.id)
            
            # Build response
            response = {
                "username": user.username,
                "user_uuid": str(user.user_uuid),
                "role": user.role if user.role else {"id": 0, "name": "Unknown"},
                "is_superuser": user.is_superuser,
                "is_tutorial_seen": False,  # Default value
                "collections_count": collections_count,
                "liked_collections_count": likes_count,  # Using likes_count as liked_collections_count
                "loans_count": 0,  # Default value
                "wishlist_items_count": wishlist_count,
                "liked_places_count": places_count,
                "number_of_connections": user.number_of_connections
            }
            return response
        except Exception as e:
            logger.error(f"get_user_me error for user {user.id}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get user me data",
                details={"error": str(e)}
            )

    async def get_user_settings(self, user: User) -> dict:
        """Get current user settings information"""
        try:
            collections_count = await self.collection_service.get_user_collections_count(user.id)
            wishlist_count = await self.collection_service.get_user_wishlist_count(user.id)
            likes_count = await self.collection_service.get_user_likes_count(user.id)
            places_count = await self.collection_service.get_user_places_count(user.id)
            return {
                "id": user.id,
                "user_uuid": str(user.user_uuid),
                "username": user.username,
                "email": user.email,
                "role": user.role.name if user.role else "Unknown",
                "is_active": user.is_active,
                "is_superuser": user.is_superuser,
                "is_accepted_terms": user.is_accepted_terms,
                "timezone": user.timezone,
                "created_at": user.created_at,
                "last_login": user.last_login,
                "number_of_connections": user.number_of_connections,
                "collections_count": collections_count,
                "wishlist_count": wishlist_count,
                "likes_count": likes_count,
                "places_count": places_count
            }
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to get user settings data",
                details={"error": str(e)}
            )

    async def update_password(self, user_id: int, new_password: str) -> bool:
        """Update user password"""
        try:
            hashed_password = hash_password(new_password)
            success = await self.repository.update_user_password(user_id, hashed_password)
            if not success:
                raise PasswordUpdateError("Failed to update password")
            return True
        except Exception as e:
            raise ServerError(
                error_code=5000,
                message="Failed to update password",
                details={"error": str(e)}
            )

    async def send_contact_message(self, user: User, message_data: ContactMessageRequest) -> ContactMessageResponse:
        """Send contact message"""
        try:
            # Send contact message email
            await send_mail(
                to=settings.EMAIL_ADMIN,
                subject=MailSubject.ContactMessage,
                username=user.username,
                email=user.email,
                user_id=user.id,
                subject_line="Contact message from VinylKeeper",
                message=message_data.message,
                sent_at=user.created_at.strftime("%Y-%m-%d %H:%M:%S") if user.created_at else "Unknown"
            )
            logger.info(f"Contact message sent to admin from user {user.username}")
            return ContactMessageResponse(
                message="Contact message sent successfully",
                sent_at=user.created_at if user.created_at else datetime.now()
            )
        except Exception as e:
            logger.error(f"Failed to send contact message from user {user.username}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to send contact message",
                details={"error": str(e)}
            )
