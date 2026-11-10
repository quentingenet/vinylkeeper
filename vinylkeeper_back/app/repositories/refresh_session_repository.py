from datetime import datetime
from typing import Optional, cast
from uuid import UUID

from sqlalchemy import delete, select, update
from sqlalchemy.engine import CursorResult
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.refresh_session_model import RefreshSession


class RefreshSessionRepository:
    """The logins of users on their devices. Callers own the commit."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self, session_id: UUID, user_id: int, jti: str, client: str, now: datetime, expires_at: datetime
    ) -> None:
        self.db.add(RefreshSession(
            id=session_id, user_id=user_id, current_jti=jti, client=client,
            created_at=now, rotated_at=now, expires_at=expires_at,
        ))
        await self.db.flush()

    async def get(self, session_id: UUID) -> Optional[RefreshSession]:
        # populate_existing: the renewal below is a plain UPDATE, a copy already loaded would be stale
        return (await self.db.execute(
            select(RefreshSession).where(RefreshSession.id == session_id).execution_options(populate_existing=True)
        )).scalar_one_or_none()

    async def rotate(
        self, session_id: UUID, expected_jti: str, new_jti: str, now: datetime, expires_at: datetime
    ) -> bool:
        """
        The refresh token is renewed, only if nobody renewed it first (compare-and-swap on the current
        one): two requests with the same token cannot both win. The old token becomes previous_jti.
        """
        result = cast(CursorResult, await self.db.execute(
            update(RefreshSession)
            .where(
                RefreshSession.id == session_id,
                RefreshSession.current_jti == expected_jti,
                RefreshSession.revoked_at.is_(None),
                RefreshSession.expires_at > now,
            )
            .values(previous_jti=RefreshSession.current_jti, current_jti=new_jti, rotated_at=now,
                    expires_at=expires_at)
        ))
        return result.rowcount > 0

    async def revoke(self, session_id: UUID, now: datetime) -> bool:
        result = cast(CursorResult, await self.db.execute(
            update(RefreshSession)
            .where(RefreshSession.id == session_id, RefreshSession.revoked_at.is_(None))
            .values(revoked_at=now)
        ))
        return result.rowcount > 0

    async def is_live(self, session_id: UUID, user_id: int, now: datetime) -> bool:
        """Exists, is the user's, is neither revoked nor expired. Does not look at the token itself."""
        return (await self.db.execute(
            select(RefreshSession.id).where(
                RefreshSession.id == session_id,
                RefreshSession.user_id == user_id,
                RefreshSession.revoked_at.is_(None),
                RefreshSession.expires_at > now,
            )
        )).first() is not None

    async def delete_expired(self, before: datetime) -> None:
        await self.db.execute(delete(RefreshSession).where(RefreshSession.expires_at < before))
