"""
"Connect with Discogs": OAuth 1.0a with PLAINTEXT signatures over HTTPS, as Discogs allows.

1. start(): VinylKeeper asks Discogs for a request token, kept for this user, and returns the
   Discogs page where the user authorizes the application.
2. complete(): Discogs sends the user back with that token and a verifier. VinylKeeper exchanges
   them for the user's access token, asks Discogs who the user is (/oauth/identity) and keeps
   the connection. Imports then read the collection as that identity, never a typed username.

The consumer secret and every token stay on the server; tokens are stored encrypted (Fernet).
Discogs has no endpoint to revoke a token: disconnecting deletes it here, and the user can
also remove VinylKeeper from the applications of their Discogs account.
"""
import secrets
import time
from datetime import timedelta
from typing import Optional
from urllib.parse import parse_qs, quote, urlencode

import httpx
from cryptography.fernet import Fernet, InvalidToken

from app.core.config_env import settings
from app.core.exceptions import ErrorCode, ServerError, ValidationError
from app.core.logging import log_activity, logger
from app.models.user_model import User
from app.repositories.discogs_connection_repository import DiscogsConnectionRepository

REQUEST_TOKEN_URL = "https://api.discogs.com/oauth/request_token"
AUTHORIZE_URL = "https://www.discogs.com/oauth/authorize"
ACCESS_TOKEN_URL = "https://api.discogs.com/oauth/access_token"
IDENTITY_URL = "https://api.discogs.com/oauth/identity"
# A user who leaves the Discogs page open longer starts again
REQUEST_LIFETIME = timedelta(minutes=15)


class DiscogsOAuthError(Exception):
    """The connection could not be made; reason is what the frontend shows."""

    def __init__(self, reason: str):
        super().__init__(reason)
        self.reason = reason


def oauth_configured() -> bool:
    return all((settings.DISCOGS_CONSUMER_KEY, settings.DISCOGS_CONSUMER_SECRET,
                settings.DISCOGS_TOKEN_KEY, settings.DISCOGS_OAUTH_CALLBACK_URL))


def _cipher() -> Fernet:
    return Fernet(settings.DISCOGS_TOKEN_KEY.encode())


def encrypt(value: str) -> str:
    return _cipher().encrypt(value.encode()).decode()


def decrypt(value: str) -> str:
    return _cipher().decrypt(value.encode()).decode()


def oauth_header(token: Optional[str] = None, token_secret: str = "", **extra: str) -> str:
    """
    OAuth 1.0a Authorization header, PLAINTEXT signature: consumer secret and token secret,
    each percent-encoded, joined by '&'. A fresh nonce and timestamp on every request.
    """
    params = {
        "oauth_consumer_key": settings.DISCOGS_CONSUMER_KEY,
        "oauth_nonce": secrets.token_hex(16),
        "oauth_signature_method": "PLAINTEXT",
        "oauth_timestamp": str(int(time.time())),
        "oauth_version": "1.0",
        **({"oauth_token": token} if token else {}),
        **extra,
    }
    params["oauth_signature"] = f"{quote(settings.DISCOGS_CONSUMER_SECRET, safe='')}&{quote(token_secret, safe='')}"
    return "OAuth " + ", ".join(f'{key}="{quote(value, safe="")}"' for key, value in params.items())


def user_authorization(access_token: str, access_secret: str):
    """Header factory for the Discogs client, signing every request as the connected user."""
    return lambda: oauth_header(access_token, access_secret)


class DiscogsOAuthService:
    def __init__(self, repository: DiscogsConnectionRepository, http_client: httpx.AsyncClient):
        self.repository = repository
        self.http_client = http_client

    def _require_configuration(self) -> None:
        if not oauth_configured():
            raise ServerError(error_code=ErrorCode.EXTERNAL_SERVICE_ERROR,
                              message="Connecting a Discogs account is not available right now", details={})

    async def _post(self, url: str, authorization: str) -> dict[str, str]:
        """A token request: Discogs answers with a form-encoded body."""
        try:
            response = await self.http_client.post(url, headers={
                "Authorization": authorization,
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": settings.USER_AGENT,
            })
        except httpx.HTTPError as e:
            raise DiscogsOAuthError("unavailable") from e
        if response.status_code != 200:
            logger.warning(f"Discogs OAuth: {url} answered {response.status_code}")
            raise DiscogsOAuthError("refused" if response.status_code in (400, 401, 403) else "unavailable")
        values = {key: items[0] for key, items in parse_qs(response.text).items()}
        if not values.get("oauth_token") or not values.get("oauth_token_secret"):
            raise DiscogsOAuthError("unavailable")
        return values

    async def start(self, user: User) -> str:
        """The Discogs page where the user authorizes VinylKeeper."""
        self._require_configuration()
        try:
            values = await self._post(
                REQUEST_TOKEN_URL, oauth_header(oauth_callback=settings.DISCOGS_OAUTH_CALLBACK_URL))
        except DiscogsOAuthError as e:
            raise ServerError(error_code=ErrorCode.EXTERNAL_SERVICE_ERROR,
                              message="Discogs is not answering, please try again later", details={}) from e
        await self.repository.delete_expired_requests(REQUEST_LIFETIME)
        await self.repository.add_request(values["oauth_token"], encrypt(values["oauth_token_secret"]), user.id)
        await self.repository.db.commit()
        return f"{AUTHORIZE_URL}?{urlencode({'oauth_token': values['oauth_token']})}"

    async def complete(self, request_token: str, verifier: str) -> str:
        """
        The user is back from Discogs: their access token and identity are kept. Returns the
        Discogs username. Raises DiscogsOAuthError: the request is unknown, expired or refused.
        """
        if not oauth_configured():
            raise DiscogsOAuthError("unavailable")
        # One use: whatever happens next, this request token cannot serve again
        pending = await self.repository.take_request(request_token, REQUEST_LIFETIME)
        await self.repository.db.commit()
        if pending is None:
            raise DiscogsOAuthError("expired")
        try:
            request_secret = decrypt(pending.request_secret)
        except InvalidToken as e:
            raise DiscogsOAuthError("expired") from e

        values = await self._post(
            ACCESS_TOKEN_URL, oauth_header(request_token, request_secret, oauth_verifier=verifier))
        access_token, access_secret = values["oauth_token"], values["oauth_token_secret"]
        try:
            response = await self.http_client.get(IDENTITY_URL, headers={
                "Authorization": oauth_header(access_token, access_secret), "User-Agent": settings.USER_AGENT})
        except httpx.HTTPError as e:
            raise DiscogsOAuthError("unavailable") from e
        identity = response.json() if response.status_code == 200 else {}
        if not isinstance(identity.get("id"), int) or not identity.get("username"):
            raise DiscogsOAuthError("unavailable")

        await self.repository.save_connection(
            pending.user_id, identity["id"], identity["username"], encrypt(access_token), encrypt(access_secret))
        await self.repository.db.commit()
        username = await self.repository.username_of(pending.user_id)
        log_activity(username or f"user {pending.user_id}", f"connected the Discogs account {identity['username']!r}")
        return identity["username"]

    async def disconnect(self, user: User) -> None:
        """The tokens are deleted here; Discogs offers no revocation endpoint."""
        if await self.repository.delete_connection(user.id):
            await self.repository.db.commit()
            log_activity(user.username, "disconnected their Discogs account")

    async def authorization_for(self, user_id: int):
        """(Discogs username, header factory) of the user's connection, or None."""
        connection = await self.repository.get_connection(user_id)
        if connection is None:
            return None
        try:
            factory = user_authorization(decrypt(connection.access_token), decrypt(connection.access_secret))
        except InvalidToken:
            # The encryption key changed: the user connects again
            logger.error(f"Discogs connection of user {user_id} cannot be decrypted")
            return None
        return connection.discogs_username, factory


def not_connected_error() -> ValidationError:
    return ValidationError(error_code=ErrorCode.INVALID_RESOURCE_STATE,
                           message="Connect your Discogs account first", details={"reason": "not_connected"})
