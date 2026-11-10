"""
Sessions of the refresh token: it is renewed at every refresh, and a copied one is detected.

Every login opens a session (a browser, the Android app). Its refresh token carries the session id
("sid") and a random "jti" that only the latest renewal knows. A refresh with the current jti
renews it. A refresh with the jti just before it, within GRACE_PERIOD, is a lost response or a
second tab: accepted. Any older jti means the token was copied (the thief and the owner both hold
one): the session is revoked and both log in again.
"""
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

from app.core.logging import logger
from app.core.transaction import transaction_context
from app.models.user_model import User
from app.repositories.refresh_session_repository import RefreshSessionRepository
from app.core.exceptions import UnauthorizedError
from app.utils.auth_utils.auth import REFRESH_TOKEN_EXPIRE_MINUTES, create_refresh_token

# Long enough for a retry after a lost response, short enough that a copied token is not forgiven
GRACE_PERIOD = timedelta(seconds=60)
# Expired sessions are kept a day (nothing reads them), then removed at the next login
PURGE_AFTER = timedelta(days=1)


def _new_jti() -> str:
    return secrets.token_hex(16)


def _revoked() -> UnauthorizedError:
    return UnauthorizedError("Session revoked")


class SessionService:
    def __init__(self, repository: RefreshSessionRepository):
        self.repository = repository

    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)

    async def open(self, user: User, client: str = "web") -> str:
        """A new session for a login: its first refresh token."""
        now = self._now()
        session_id, jti = uuid4(), _new_jti()
        async with transaction_context(self.repository.db):
            await self.repository.delete_expired(now - PURGE_AFTER)
            await self.repository.create(
                session_id, user.id, jti, client, now, now + timedelta(minutes=REFRESH_TOKEN_EXPIRE_MINUTES))
        return create_refresh_token(str(user.user_uuid), user.token_version, str(session_id), jti)

    async def rotate(self, user: User, payload: dict, client: str = "web") -> str:
        """
        The next refresh token of the session of a refresh token the caller has already verified.
        A token issued before sessions existed has none: it opens one (nobody is logged out).
        """
        sid, jti = payload.get("sid"), payload.get("jti")
        if not sid or not jti:
            return await self.open(user, client)
        try:
            session_id = UUID(str(sid))
        except ValueError:
            raise _revoked()

        # A second pass only when another request renewed the token between our read and our write
        for _ in range(2):
            now = self._now()
            session = await self.repository.get(session_id)
            if session is None or session.user_id != user.id or session.revoked_at is not None \
                    or session.expires_at <= now:
                raise _revoked()
            if jti != session.current_jti and not (
                jti == session.previous_jti and now - session.rotated_at <= GRACE_PERIOD
            ):
                await self._revoke_after_reuse(session_id, user, now)
                raise _revoked()

            new_jti = _new_jti()
            expires_at = now + timedelta(minutes=REFRESH_TOKEN_EXPIRE_MINUTES)
            async with transaction_context(self.repository.db):
                renewed = await self.repository.rotate(session_id, session.current_jti, new_jti, now, expires_at)
            if renewed:
                return create_refresh_token(str(user.user_uuid), user.token_version, str(session_id), new_jti)
        raise _revoked()

    async def _revoke_after_reuse(self, session_id: UUID, user: User, now: datetime) -> None:
        async with transaction_context(self.repository.db):
            await self.repository.revoke(session_id, now)
        logger.warning(f"Refresh token reused: session {session_id} of user {user.id} revoked")

    async def revoke(self, payload: dict) -> None:
        """Logout of this device. Never raises: logging out must always work."""
        try:
            session_id = UUID(str(payload.get("sid")))
            async with transaction_context(self.repository.db):
                await self.repository.revoke(session_id, self._now())
        except (ValueError, TypeError):
            return
        except Exception as e:
            logger.warning(f"Session not revoked at logout: {e}")

