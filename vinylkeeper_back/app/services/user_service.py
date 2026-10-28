from datetime import datetime, timezone
from app.repositories.user_repository import UserRepository
from app.core.security import verify_password_async, hash_password_async
from sqlalchemy.exc import IntegrityError
from app.utils.auth_utils.auth import (
    TokenType,
    create_email_change_token,
    create_email_confirmation_token,
    create_reset_token,
    decode_email_token,
    token_version_of,
    verify_reset_token,
)
from app.models.user_model import User
from app.schemas.user_schema import (
    UserCreate,
    ContactMessageRequest,
    ContactMessageResponse
)
import uuid
from app.mails.client_mail import send_mail, MailSubject
from app.core.exceptions import (
    InvalidCredentialsError,
    InvalidResetTokenError,
    ResourceNotFoundError,
    PasswordUpdateError,
    UserNotFoundError,
    DuplicateEmailError,
    DuplicateUsernameError,
    ValidationError,
    ErrorCode,
    InvalidEmailTokenError,
    ServerError,
)
from app.services.collection_service import CollectionService
from app.schemas.collection_schema import CollectionCreate
from app.core.transaction import transaction_context
from app.core.config_env import settings
from app.core.logging import logger
from app.core.enums import RoleEnum


class UserService:
    def __init__(self, repository: UserRepository, collection_service: CollectionService):
        self.repository = repository
        self.collection_service = collection_service

    async def authenticate(self, email: str, password: str) -> User:
        """Authenticate a user with email and password"""
        user = await self.repository.get_user_by_email(email)
        if not user:
            raise InvalidCredentialsError()

        if not await verify_password_async(user.password, password):
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
                password=await hash_password_async(user_data.password),
                role_id=await self._default_role_id(),
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

    async def _default_role_id(self) -> int:
        """
        Role of a new account, never chosen by the client. Looked up by name: role ids
        depend on the order the reference data was inserted in each database.
        """
        role_id = await self.repository.get_role_id_by_name(RoleEnum.USER.value)
        if role_id is None:
            raise ServerError(error_code=ErrorCode.SERVER_ERROR, message="Default user role not found")
        return role_id

    async def send_welcome_email(self, user: User) -> None:
        """Registration email: welcome and link to confirm the address. Never raises."""
        await self._send_safely(
            user.email, MailSubject.Welcome, f"welcome email of user {user.username}",
            username=user.username,
            token=create_email_confirmation_token(str(user.user_uuid), user.email),
        )

    async def resend_email_confirmation(self, user: User) -> bool:
        """New confirmation link. Returns False when the email is already confirmed."""
        if user.is_email_confirmed:
            return False
        sent = await self._send_safely(
            user.email, MailSubject.EmailConfirmation, f"confirmation email of user {user.username}",
            username=user.username,
            token=create_email_confirmation_token(str(user.user_uuid), user.email),
        )
        if not sent:
            raise ServerError(
                error_code=ErrorCode.EXTERNAL_SERVICE_ERROR,
                message="The confirmation email could not be sent, please try again later",
            )
        return True

    async def request_email_change(self, user: User, new_email: str, current_password: str) -> None:
        """
        Send a confirmation link to the new address and a notice to the current one.
        The email changes only when the link is opened (confirm_email).
        """
        # 400 rather than the 401 of InvalidCredentialsError: the session itself is valid
        if not await verify_password_async(user.password, current_password):
            raise ValidationError(
                error_code=ErrorCode.INVALID_CREDENTIALS,
                message="Wrong current password",
                details={"field": "current_password"},
            )
        if new_email == user.email.lower():
            raise ValidationError(
                error_code=ErrorCode.INVALID_INPUT,
                message="This is already your email address",
                details={"field": "new_email"},
            )
        if await self.repository.is_email_taken(new_email):
            raise DuplicateEmailError(new_email)

        token = create_email_change_token(str(user.user_uuid), user.email, new_email, user.token_version)
        sent = await self._send_safely(
            new_email, MailSubject.EmailChangeConfirmation, f"email change confirmation of user {user.username}",
            username=user.username, new_email=new_email, token=token,
        )
        if not sent:
            raise ServerError(
                error_code=ErrorCode.EXTERNAL_SERVICE_ERROR,
                message="The confirmation email could not be sent, please try again later",
            )
        await self._send_safely(
            user.email, MailSubject.EmailChangeNotice, f"email change notice of user {user.username}",
            username=user.username, new_email=new_email,
        )

    async def confirm_email(self, token: str) -> str:
        """
        Apply a confirmation link: confirms the registration email, or replaces the email.
        Opening the same link twice succeeds. Returns the confirmed email address.
        """
        payload = decode_email_token(token)
        user = await self.repository.get_user_by_uuid(payload["sub"])
        if not user:
            raise InvalidEmailTokenError()
        email = payload["email"]

        if payload["type"] == TokenType.EMAIL_CONFIRM.value:
            if user.email != email:
                # The email changed since this link was sent
                raise InvalidEmailTokenError()
            if not user.is_email_confirmed:
                async with transaction_context(self.repository.db):
                    await self.repository.confirm_email(user.id, email)
            return email

        # Email change: already applied (link opened twice) is a success
        if user.email == email:
            return email
        if user.email != payload.get("cur") or token_version_of(payload) != user.token_version:
            raise InvalidEmailTokenError()
        if await self.repository.is_email_taken(email):
            raise DuplicateEmailError(email)
        try:
            async with transaction_context(self.repository.db):
                if not await self.repository.change_email(user.id, payload["cur"], email):
                    raise InvalidEmailTokenError()
        except IntegrityError:
            # Taken by another account between the check and the update
            raise DuplicateEmailError(email)
        logger.info(f"Email changed for user {user.username}")
        return email

    @staticmethod
    async def _send_safely(to: str, subject: MailSubject, label: str, **kwargs) -> bool:
        """send_mail with logging; True when sent. Never raises."""
        try:
            sent = await send_mail(to=to, subject=subject, **kwargs)
        except Exception as e:
            logger.error(f"Failed to send {label}: {str(e)}", exc_info=True)
            return False
        if not sent:
            logger.error(f"Failed to send {label}")
        return sent

    async def send_password_reset_email(self, email: str) -> None:
        """Send password reset email"""
        user = await self.repository.get_user_by_email(email)
        if not user:
            return

        reset_token = create_reset_token(str(user.user_uuid), user.token_version)
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
        """Reset user password, then revoke every session and this reset link"""
        user_uuid, token_version = verify_reset_token(token)
        user = await self.repository.get_user_by_uuid(user_uuid)
        if not user:
            raise UserNotFoundError(user_uuid)
        if token_version != user.token_version:
            # Link already used, or the password changed since it was sent
            raise InvalidResetTokenError()

        await self._update_password(user, new_password)

    async def change_password(self, user: User, current_password: str, new_password: str) -> None:
        """Change user password and revoke every session (the caller issues new tokens)"""
        if not await verify_password_async(user.password, current_password):
            raise InvalidCredentialsError()

        await self._update_password(user, new_password)

    async def _update_password(self, user: User, new_password: str) -> None:
        """Store the new password and bump token_version, which revokes every token issued before"""
        hashed_password = await hash_password_async(new_password)
        new_token_version = user.token_version + 1
        async with transaction_context(self.repository.db):
            success = await self.repository.update_user_password(user.id, hashed_password, new_token_version)
            if not success:
                raise PasswordUpdateError()
        user.token_version = new_token_version

    async def send_new_user_registered_email(self, user: User) -> None:
        """Send email to admin about new user registration. Skipped in dev or for admin users."""
        is_dev = settings.APP_ENV == "development"
        is_admin = user.role and user.role.name == RoleEnum.ADMIN.value and user.is_superuser
        if is_dev or is_admin:
            return
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
            "is_accepted_terms": user.is_accepted_terms,
            "is_email_confirmed": user.is_email_confirmed,
        }

    async def send_contact_message(self, user: User, message_data: ContactMessageRequest) -> ContactMessageResponse:
        """Send contact message"""
        sent_at = datetime.now(timezone.utc)
        await send_mail(
            to=settings.EMAIL_ADMIN,
            subject=MailSubject.ContactMessage,
            username=user.username,
            email=user.email,
            user_id=user.id,
            subject_line=message_data.subject,
            message=message_data.message,
            sent_at=sent_at.strftime("%Y-%m-%d %H:%M:%S UTC")
        )
        logger.info(f"Contact message sent to admin from user {user.username}")
        return ContactMessageResponse(
            message="Contact message sent successfully",
            sent_at=sent_at
        )
