from datetime import datetime, timezone
from app.repositories.user_repository import UserRepository
from app.core.security import verify_password, hash_password
from app.utils.auth_utils.auth import create_reset_token, verify_reset_token
from app.models.user_model import User
from app.schemas.user_schema import (
    UserCreate,
    UserUpdate,
    ContactMessageRequest,
    ContactMessageResponse
)
import uuid
from app.mails.client_mail import send_mail, MailSubject
from app.core.exceptions import (
    InvalidCredentialsError,
    ResourceNotFoundError,
    EmailNotFoundError,
    PasswordUpdateError,
    UserNotFoundError,
    DuplicateEmailError,
    DuplicateUsernameError,
)
from app.services.collection_service import CollectionService
from app.schemas.collection_schema import CollectionCreate
from app.core.transaction import transaction_context
from typing import List, Tuple
from app.core.config_env import settings
from app.core.logging import logger


class UserService:
    def __init__(self, repository: UserRepository, collection_service: CollectionService):
        self.repository = repository
        self.collection_service = collection_service

    async def authenticate(self, email: str, password: str) -> User:
        """Authenticate a user with email and password"""
        user = await self.repository.get_user_by_email(email)
        if not user:
            raise EmailNotFoundError(email)

        if not verify_password(user.password, password):
            raise InvalidCredentialsError()

        user.number_of_connections += 1
        user.last_login = datetime.now(timezone.utc)

        async with transaction_context(self.repository.db):
            await self.repository.update_user_last_login(user)
        return user

    async def get_user_by_id(self, user_id: int) -> User:
        """Get a user by ID"""
        user = await self.repository.get_user_by_id(user_id)
        if not user:
            raise ResourceNotFoundError("User", user_id)
        return user

    async def get_user_by_uuid(self, user_uuid: str) -> User:
        """Get a user by UUID"""
        user = await self.repository.get_user_by_uuid(user_uuid)
        if not user:
            raise UserNotFoundError(user_uuid)
        return user

    async def create_user(self, user_data: UserCreate) -> User:
        """Create a new user with initial collection in a single atomic transaction"""
        async with transaction_context(self.repository.db):
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

            created_user = await self.repository.create_user(user)

            first_collection = CollectionCreate(
                name=f"{created_user.username}'s collection",
                description="My first collection",
                is_public=False,
            )
            await self.collection_service.create_collection(
                collection_data=first_collection,
                user_id=created_user.id
            )

            created_user.number_of_connections = 1
            created_user.last_login = datetime.now(timezone.utc)

            return created_user

    async def update_user(self, user: User, user_data: UserUpdate) -> User:
        """Update user information"""
        if user_data.email and user_data.email != user.email:
            if await self.repository.is_email_taken(user_data.email):
                raise DuplicateEmailError(user_data.email)

        if user_data.username and user_data.username != user.username:
            if await self.repository.is_username_taken(user_data.username):
                raise DuplicateUsernameError(user_data.username)

        update_data = user_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(user, key, value)

        async with transaction_context(self.repository.db):
            updated_user = await self.repository.update_user(user)
        return updated_user

    async def send_password_reset_email(self, email: str) -> None:
        """Send password reset email"""
        user = await self.repository.get_user_by_email(email)
        if not user:
            return

        reset_token = create_reset_token(str(user.user_uuid))
        email_sent = await send_mail(
            to=user.email,
            subject=MailSubject.PasswordReset,
            token=reset_token
        )
        if not email_sent:
            logger.error(f"Failed to send password reset email for user {user.username}")
        else:
            logger.info(f"Password reset email sent for user {user.username}")

    async def reset_password(self, token: str, new_password: str) -> None:
        """Reset user password"""
        user_uuid = verify_reset_token(token)
        user = await self.repository.get_user_by_uuid(user_uuid)
        if not user:
            raise UserNotFoundError(user_uuid)

        hashed_password = hash_password(new_password)
        async with transaction_context(self.repository.db):
            success = await self.repository.update_user_password(user.id, hashed_password)
            if not success:
                raise PasswordUpdateError()

    async def change_password(self, user: User, current_password: str, new_password: str) -> None:
        """Change user password"""
        if not verify_password(user.password, current_password):
            raise InvalidCredentialsError()

        hashed_password = hash_password(new_password)
        async with transaction_context(self.repository.db):
            success = await self.repository.update_user_password(user.id, hashed_password)
            if not success:
                raise PasswordUpdateError()

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
                logger.error(
                    f"Failed to send new user email to admin for user {user.username}")
            else:
                logger.info(
                    f"New user email sent to admin for user {user.username}")
        except Exception as e:
            logger.error(f"Failed to send new user email: {str(e)}", exc_info=True)

    async def get_all_users(self, skip: int = 0, limit: int = 100) -> Tuple[List[User], int]:
        """Get all users with pagination"""
        users = await self.repository.get_all_users(skip, limit)
        total_count = await self.repository.count_users()
        return users, total_count

    async def delete_user(self, user: User) -> bool:
        """Delete a user"""
        async with transaction_context(self.repository.db):
            result = await self.repository.delete_user(user.id)
        return result

    async def get_user_me(self, user: User) -> dict:
        """Get current user information (optimized - no expensive calculations)"""
        is_admin = (
            user.role and
            user.role.name == "admin" and
            user.is_superuser
        )
        is_tutorial_seen = user.number_of_connections > 2
        return {
            "username": user.username,
            "user_uuid": str(user.user_uuid),
            "is_admin": is_admin,
            "is_tutorial_seen": is_tutorial_seen,
            "number_of_connections": user.number_of_connections
        }

    async def get_user_settings(self, user: User) -> dict:
        """Get current user settings information (only fields used by frontend)"""
        return {
            "username": user.username,
            "email": user.email,
            "user_uuid": str(user.user_uuid),
            "created_at": user.created_at,
            "is_accepted_terms": user.is_accepted_terms
        }

    async def send_contact_message(self, user: User, message_data: ContactMessageRequest) -> ContactMessageResponse:
        """Send contact message"""
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
            sent_at=datetime.now(timezone.utc)
        )
