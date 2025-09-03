from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.models.user_model import User
from app.models.moderation_request_model import ModerationRequest
from typing import Optional, List
from app.core.exceptions import ServerError
from app.core.logging import logger
from app.core.transaction import TransactionalMixin


class UserRepository(TransactionalMixin):
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Get a user by email"""
        try:
            result = await self.db.execute(select(User).filter(User.email == email))
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error retrieving user by email {email}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get user by email",
                details={"error": str(e)}
            )

    async def get_user_by_id(self, user_id: int) -> Optional[User]:
        """Get a user by id"""
        try:
            result = await self.db.execute(
                select(User).options(selectinload(User.role)).filter(User.id == user_id)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error retrieving user {user_id}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get user by id",
                details={"error": str(e)}
            )

    async def get_user_by_uuid(self, user_uuid: str) -> Optional[User]:
        """Get a user by UUID"""
        try:
            result = await self.db.execute(select(User).filter(User.user_uuid == user_uuid))
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error retrieving user by UUID {user_uuid}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get user by uuid",
                details={"error": str(e)}
            )

    async def create_user(self, user: User) -> User:
        """Create a new user without committing (transaction managed by service)."""
        try:
            await self._add_entity(user, flush=True)  # Flush to get the ID
            await self._refresh_entity(user)
            return user
        except Exception as e:
            logger.error(f"Error creating user {user.username}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to create user",
                details={"error": str(e)}
            )

    async def update_user(self, user: User) -> User:
        """Update a user without committing (transaction managed by service)."""
        try:
            await self._add_entity(user, flush=True)  # Flush to ensure changes are persisted
            await self._refresh_entity(user)
            return user
        except Exception as e:
            logger.error(f"Error updating user {user.id}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to update user",
                details={"error": str(e)}
            )

    async def update_user_last_login(self, user: User) -> User:
        """Update user's number of connections and last login without committing (transaction managed by service)."""
        try:
            await self._add_entity(user, flush=True)  # Flush to ensure changes are persisted
            await self._refresh_entity(user)
            return user
        except Exception as e:
            logger.error(f"Error updating last login for user {user.id}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to update user last login",
                details={"error": str(e)}
            )

    async def update_user_password(self, user_id: int, hashed_password: str) -> bool:
        """Update user's password without committing (transaction managed by service)."""
        try:
            user = await self.get_user_by_id(user_id)
            if not user:
                return False

            user.password = hashed_password
            await self._add_entity(user, flush=False)  # No flush needed for simple update
            return True
        except Exception as e:
            logger.error(f"Error updating password for user {user_id}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to update user password",
                details={"error": str(e)}
            )

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
        except Exception as e:
            logger.error(f"Error deleting user {user_id}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to delete user",
                details={"error": str(e)}
            )

    async def is_email_taken(self, email: str) -> bool:
        """Check if email is already taken"""
        try:
            return await self.get_user_by_email(email) is not None
        except Exception as e:
            logger.error(f"Error checking if email {email} is taken: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to check if email is taken",
                details={"error": str(e)}
            )

    async def is_username_taken(self, username: str) -> bool:
        """Check if username is already taken"""
        try:
            result = await self.db.execute(select(User).filter(User.username == username))
            return result.scalar_one_or_none() is not None
        except Exception as e:
            logger.error(f"Error checking if username {username} is taken: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to check if username is taken",
                details={"error": str(e)}
            )

    async def get_all_users(self, skip: int = 0, limit: int = 100) -> List[User]:
        """Get all users with pagination"""
        try:
            result = await self.db.execute(select(User).offset(skip).limit(limit))
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error retrieving users (skip: {skip}, limit: {limit}): {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to get all users",
                details={"error": str(e)}
            )

    async def count_users(self) -> int:
        """Count total number of users"""
        try:
            result = await self.db.execute(select(func.count(User.id)))
            return result.scalar() or 0
        except Exception as e:
            logger.error(f"Error counting users: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to count users",
                details={"error": str(e)}
            )
