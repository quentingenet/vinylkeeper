from app.repositories.user_repository import UserRepository
from app.core.security import verify_password, hash_password
from app.utils.auth_utils.auth import create_reset_token, verify_reset_token
from app.models.user_model import User
from app.schemas.user_schema import UserCreate
from sqlalchemy.exc import IntegrityError
import uuid
from fastapi import BackgroundTasks
from app.mails.client_mail import send_mail, MailSubject
from app.core.config_env import Settings
from app.core.exceptions import (
    InvalidCredentialsError,
    ResourceNotFoundError,
    InvalidInputError,
    EmailNotFoundError,
    InvalidResetTokenError,
    PasswordUpdateError,
    UserNotFoundError,
    DuplicateEmailError,
    DuplicateUsernameError
)
from app.core.logging import logger


class UserService:
    def __init__(self, repository: UserRepository):
        self.repository = repository

    def authenticate(self, email: str, password: str) -> User:
        user = self.repository.get_user_by_email(email)
        if not user:
            raise EmailNotFoundError(email)

        if not verify_password(user.password, password):
            raise InvalidCredentialsError()

        user.number_of_connections += 1
        self.repository.update_number_of_connections(user)
        return user

    def get_user_by_id(self, user_id: int) -> User:
        user = self.repository.get_user_by_id(user_id)
        if not user:
            raise ResourceNotFoundError("User", user_id)
        return user

    def create_user(self, user_data: UserCreate) -> User:
        # Prevent duplicate emails and usernames
        if self.repository.is_email_taken(user_data.email):
            raise DuplicateEmailError(user_data.email)

        if self.repository.is_username_taken(user_data.username):
            raise DuplicateUsernameError(user_data.username)

        user = User(
            user_uuid=uuid.uuid4(),
            username=user_data.username,
            email=user_data.email,
            password=hash_password(user_data.password),
            role_id=user_data.role_id if user_data.role_id else 2,
            is_accepted_terms=user_data.is_accepted_terms,
            timezone=user_data.timezone
        )
        return self.repository.create_user(user)

    def send_password_reset_email(self, email: str, background_tasks: BackgroundTasks) -> None:
        user = self.repository.get_user_by_email(email)
        if not user:
            return

        reset_token = create_reset_token(str(user.user_uuid))
        background_tasks.add_task(
            send_mail,
            user.email,
            MailSubject.PasswordReset,
            reset_token=reset_token
        )

    def reset_password(self, token: str, new_password: str) -> None:
        user_uuid = verify_reset_token(token)
        user = self.repository.get_user_by_uuid(user_uuid)
        if not user:
            raise UserNotFoundError(user_uuid)

        hashed_password = hash_password(new_password)
        success = self.repository.update_user_password(
            user.id, hashed_password)
        if not success:
            raise PasswordUpdateError()
