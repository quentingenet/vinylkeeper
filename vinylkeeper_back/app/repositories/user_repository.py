from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, update, func, or_
from sqlalchemy.orm import selectinload
from app.models.user_model import User
from app.models.moderation_request_model import ModerationRequest
from app.models.reference_data.roles import Role
from typing import Optional
from app.core.transaction import TransactionalMixin


class UserRepository(TransactionalMixin):
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Get a user by email"""
        # lower(): accounts created before emails were lowercased may hold capitals
        result = await self.db.execute(select(User).filter(func.lower(User.email) == email.lower()))
        return result.scalar_one_or_none()

    async def get_user_by_id(self, user_id: int) -> Optional[User]:
        """Get a user by id"""
        result = await self.db.execute(
            select(User).options(selectinload(User.role)).filter(User.id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_user_by_uuid(self, user_uuid: str) -> Optional[User]:
        """Get a user by UUID"""
        result = await self.db.execute(select(User).filter(User.user_uuid == user_uuid))
        return result.scalar_one_or_none()

    async def create_user(self, user: User) -> User:
        """Create a new user without committing (transaction managed by service)."""
        await self._add_entity(user, flush=True)
        await self._refresh_entity(user)
        return user

    async def update_user(self, user: User) -> User:
        """Update a user without committing (transaction managed by service)."""
        await self._add_entity(user, flush=True)
        await self._refresh_entity(user)
        return user

    async def update_user_last_login(self, user: User) -> User:
        """Update user's number of connections and last login without committing (transaction managed by service)."""
        await self._add_entity(user, flush=True)
        await self._refresh_entity(user)
        return user

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
        result = await self.db.execute(
            update(User)
            .where(User.id == user_id)
            .values(password=hashed_password, token_version=token_version)
        )
        return result.rowcount > 0

    async def get_role_id_by_name(self, role_name: str) -> Optional[int]:
        """Id of a role, looked up by name: role ids differ between databases"""
        result = await self.db.execute(select(Role.id).where(Role.name == role_name))
        return result.scalar_one_or_none()

    async def confirm_email(self, user_id: int, email: str) -> bool:
        """Mark the email confirmed, only if it is still the email of the account (no commit)"""
        result = await self.db.execute(
            update(User)
            .where(User.id == user_id, User.email == email)
            .values(is_email_confirmed=True)
        )
        return result.rowcount > 0

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
        user = await self.get_user_by_id(user_id)
        if not user:
            return False

        # Delete moderation requests in batch (no cascade delete)
        delete_moderation_query = ModerationRequest.__table__.delete().where(ModerationRequest.user_id == user_id)
        await self.db.execute(delete_moderation_query)

        # Delete the user (other relations have cascade delete)
        await self._delete_entity(user)
        return True

    async def is_email_taken(self, email: str) -> bool:
        """Check if email is already taken"""
        result = await self.db.execute(
            select(func.count(User.id)).where(func.lower(User.email) == email.lower())
        )
        return result.scalar() > 0

    async def is_username_taken(self, username: str) -> bool:
        """Check if username is already taken"""
        result = await self.db.execute(
            select(func.count(User.id)).where(User.username == username)
        )
        return result.scalar() > 0
