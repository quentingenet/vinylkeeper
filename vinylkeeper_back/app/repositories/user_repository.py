from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, update, func, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import SQLAlchemyError
from app.models.user_model import User
from app.models.moderation_request_model import ModerationRequest
from app.models.reference_data.roles import Role
from typing import Optional
from app.core.exceptions import ServerError
from app.core.logging import logger
from app.core.transaction import TransactionalMixin


class UserRepository(TransactionalMixin):
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Get a user by email"""
        try:
            # lower(): accounts created before emails were lowercased may hold capitals
            result = await self.db.execute(select(User).filter(func.lower(User.email) == email.lower()))
            return result.scalar_one_or_none()
        except SQLAlchemyError as e:
            logger.error(f"Error retrieving user by email: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get user by email",
                details={}
            )

    async def get_user_by_id(self, user_id: int) -> Optional[User]:
        """Get a user by id"""
        try:
            result = await self.db.execute(
                select(User).options(selectinload(User.role)).filter(User.id == user_id)
            )
            return result.scalar_one_or_none()
        except SQLAlchemyError as e:
            logger.error(f"Error retrieving user {user_id}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get user by id",
                details={}
            )

    async def get_user_by_uuid(self, user_uuid: str) -> Optional[User]:
        """Get a user by UUID"""
        try:
            result = await self.db.execute(select(User).filter(User.user_uuid == user_uuid))
            return result.scalar_one_or_none()
        except SQLAlchemyError as e:
            logger.error(f"Error retrieving user by UUID {user_uuid}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get user by uuid",
                details={}
            )

    async def create_user(self, user: User) -> User:
        """Create a new user without committing (transaction managed by service)."""
        try:
            await self._add_entity(user, flush=True)
            await self._refresh_entity(user)
            return user
        except SQLAlchemyError as e:
            logger.error(f"Error creating user {user.username}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to create user",
                details={}
            )

    async def update_user(self, user: User) -> User:
        """Update a user without committing (transaction managed by service)."""
        try:
            await self._add_entity(user, flush=True)
            await self._refresh_entity(user)
            return user
        except SQLAlchemyError as e:
            logger.error(f"Error updating user {user.id}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to update user",
                details={}
            )

    async def update_user_last_login(self, user: User) -> User:
        """Update user's number of connections and last login without committing (transaction managed by service)."""
        try:
            await self._add_entity(user, flush=True)
            await self._refresh_entity(user)
            return user
        except SQLAlchemyError as e:
            logger.error(f"Error updating last login for user {user.id}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to update user last login",
                details={}
            )

    async def touch_last_seen(self, user_id: int, min_interval: timedelta) -> bool:
        """
        Set last_seen_at to now unless it was set less than min_interval ago (no commit).
        One conditional UPDATE: a restored session costs no write most of the time.
        """
        now = datetime.now(timezone.utc)
        result = await self.db.execute(
            update(User)
            .where(User.id == user_id, or_(User.last_seen_at.is_(None), User.last_seen_at < now - min_interval))
            .values(last_seen_at=now)
        )
        return result.rowcount > 0

    async def update_user_password(self, user_id: int, hashed_password: str, token_version: int) -> bool:
        """Update user's password and token_version without committing (transaction managed by service)."""
        try:
            result = await self.db.execute(
                update(User)
                .where(User.id == user_id)
                .values(password=hashed_password, token_version=token_version)
            )
            return result.rowcount > 0
        except SQLAlchemyError as e:
            logger.error(f"Error updating password for user {user_id}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to update user password",
                details={}
            )

    async def get_role_id_by_name(self, role_name: str) -> Optional[int]:
        """Id of a role, looked up by name: role ids differ between databases"""
        try:
            result = await self.db.execute(select(Role.id).where(Role.name == role_name))
            return result.scalar_one_or_none()
        except SQLAlchemyError as e:
            logger.error(f"Error retrieving role {role_name}: {str(e)}")
            raise ServerError(error_code=5000, message="Failed to get role", details={})

    async def confirm_email(self, user_id: int, email: str) -> bool:
        """Mark the email confirmed, only if it is still the email of the account (no commit)"""
        try:
            result = await self.db.execute(
                update(User)
                .where(User.id == user_id, User.email == email)
                .values(is_email_confirmed=True)
            )
            return result.rowcount > 0
        except SQLAlchemyError as e:
            logger.error(f"Error confirming email of user {user_id}: {str(e)}")
            raise ServerError(error_code=5000, message="Failed to confirm email", details={})

    async def change_email(self, user_id: int, current_email: str, new_email: str) -> bool:
        """
        Replace the email, only if the account still has current_email (no commit).
        A unique violation (address taken meanwhile) propagates as IntegrityError.
        """
        result = await self.db.execute(
            update(User)
            .where(User.id == user_id, User.email == current_email)
            .values(email=new_email, is_email_confirmed=True)
        )
        return result.rowcount > 0

    async def delete_user(self, user_id: int) -> bool:
        """Delete a user using batch operations (optimized)."""
        try:
            user = await self.get_user_by_id(user_id)
            if not user:
                return False

            # Delete moderation requests in batch (no cascade delete)
            delete_moderation_query = ModerationRequest.__table__.delete().where(ModerationRequest.user_id == user_id)
            await self.db.execute(delete_moderation_query)

            # Delete the user (other relations have cascade delete)
            await self._delete_entity(user)
            return True
        except SQLAlchemyError as e:
            logger.error(f"Error deleting user {user_id}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to delete user",
                details={}
            )

    async def is_email_taken(self, email: str) -> bool:
        """Check if email is already taken"""
        try:
            result = await self.db.execute(
                select(func.count(User.id)).where(func.lower(User.email) == email.lower())
            )
            return result.scalar() > 0
        except SQLAlchemyError as e:
            logger.error(f"Error checking if email is taken: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to check if email is taken",
                details={}
            )

    async def is_username_taken(self, username: str) -> bool:
        """Check if username is already taken"""
        try:
            result = await self.db.execute(
                select(func.count(User.id)).where(User.username == username)
            )
            return result.scalar() > 0
        except SQLAlchemyError as e:
            logger.error(f"Error checking if username {username} is taken: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to check if username is taken",
                details={}
            )
