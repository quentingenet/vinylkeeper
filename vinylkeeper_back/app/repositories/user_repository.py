from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.models.user_model import User
from typing import Optional, List
from app.core.exceptions import ServerError
from app.core.logging import logger


class UserRepository:
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
        """Create a new user"""
        try:
            self.db.add(user)
            await self.db.commit()
            await self.db.refresh(user)
            return user
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating user {user.username}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to create user",
                details={"error": str(e)}
            )

    async def update_user(self, user: User) -> User:
        """Update a user"""
        try:
            self.db.add(user)
            await self.db.commit()
            await self.db.refresh(user)
            return user
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating user {user.id}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to update user",
                details={"error": str(e)}
            )

    async def update_user_last_login(self, user: User) -> User:
        """Update user's number of connections and last login"""
        try:
            self.db.add(user)
            await self.db.commit()
            await self.db.refresh(user)
            return user
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating last login for user {user.id}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to update user last login",
                details={"error": str(e)}
            )

    async def update_user_password(self, user_id: int, hashed_password: str) -> bool:
        """Update user's password"""
        try:
            user = await self.get_user_by_id(user_id)
            if not user:
                return False

            user.password = hashed_password
            self.db.add(user)
            await self.db.commit()
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating password for user {user_id}: {str(e)}")
            raise ServerError(
                error_code=5000,
                message="Failed to update user password",
                details={"error": str(e)}
            )

    async def delete_user(self, user_id: int) -> bool:
        """Delete a user"""
        try:
            user = await self.get_user_by_id(user_id)
            if not user:
                return False

            # Delete moderation requests first (no cascade delete)
            from app.models.moderation_request_model import ModerationRequest
            moderation_requests = await self.db.execute(
                select(ModerationRequest).filter(ModerationRequest.user_id == user_id)
            )
            for request in moderation_requests.scalars().all():
                await self.db.delete(request)

            # Delete the user (other relations have cascade delete)
            await self.db.delete(user)
            await self.db.commit()
            return True
        except Exception as e:
            await self.db.rollback()
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
