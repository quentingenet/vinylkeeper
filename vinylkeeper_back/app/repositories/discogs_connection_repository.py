from datetime import timedelta
from typing import Optional, cast

from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.engine import CursorResult
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.discogs_connection_model import DiscogsConnection, DiscogsOAuthRequest
from app.models.user_model import User


class DiscogsConnectionRepository:
    """Discogs accounts connected with OAuth, and authorizations in progress. Callers own the commit."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def add_request(self, request_token: str, encrypted_secret: str, user_id: int) -> None:
        self.db.add(DiscogsOAuthRequest(request_token=request_token, request_secret=encrypted_secret, user_id=user_id))
        await self.db.flush()

    async def take_request(self, request_token: str, lifetime: timedelta) -> Optional[DiscogsOAuthRequest]:
        """The pending request of this token if still valid; deleted in any case (one use)."""
        row = (await self.db.execute(
            delete(DiscogsOAuthRequest).where(DiscogsOAuthRequest.request_token == request_token)
            .returning(DiscogsOAuthRequest, (DiscogsOAuthRequest.created_at < func.now() - lifetime).label("expired"))
        )).first()
        if row is None or row.expired:
            return None
        return row[0]

    async def delete_expired_requests(self, lifetime: timedelta) -> None:
        await self.db.execute(delete(DiscogsOAuthRequest).where(DiscogsOAuthRequest.created_at < func.now() - lifetime))

    async def save_connection(
        self, user_id: int, discogs_user_id: int, discogs_username: str, encrypted_token: str, encrypted_secret: str
    ) -> None:
        """One connection per user: connecting again replaces it, a new account included."""
        values = {"discogs_user_id": discogs_user_id, "discogs_username": discogs_username,
                  "access_token": encrypted_token, "access_secret": encrypted_secret}
        await self.db.execute(
            insert(DiscogsConnection).values(user_id=user_id, **values)
            .on_conflict_do_update(index_elements=[DiscogsConnection.user_id],
                                   set_={**values, "connected_at": func.now()})
        )

    async def get_connection(self, user_id: int) -> Optional[DiscogsConnection]:
        return (await self.db.execute(
            select(DiscogsConnection).where(DiscogsConnection.user_id == user_id))).scalar_one_or_none()

    async def delete_connection(self, user_id: int) -> bool:
        result = cast(CursorResult, await self.db.execute(
            delete(DiscogsConnection).where(DiscogsConnection.user_id == user_id)))
        return result.rowcount > 0

    async def username_of(self, user_id: int) -> Optional[str]:
        return (await self.db.execute(select(User.username).where(User.id == user_id))).scalar_one_or_none()
