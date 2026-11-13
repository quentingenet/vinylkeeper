from datetime import timedelta
from typing import Optional
from urllib.parse import urlencode

from fastapi import APIRouter, BackgroundTasks, Depends, Query, Request, Response, status
from fastapi.responses import RedirectResponse

from app.core.config_env import settings
from app.core.logging import logger
from app.db.session import get_db
from app.deps.deps import get_discogs_import_repository
from app.models.user_model import User
from app.repositories.discogs_connection_repository import DiscogsConnectionRepository
from app.repositories.discogs_import_repository import DiscogsImportRepository
from app.schemas.discogs_import_schema import (
    DiscogsAuthorizeResponse,
    DiscogsConnectionStatus,
    DiscogsOAuthComplete,
    DiscogsImportCreate,
    DiscogsImportPreview,
    DiscogsImportResponse,
)
from app.services.album_enrichment_service import DiscogsClient
from app.services.discogs_import_service import (
    DiscogsImportError,
    DiscogsImportService,
    raise_for_preview,
    run_discogs_imports,
)
from app.services.discogs_oauth_service import (
    DiscogsOAuthError,
    DiscogsOAuthService,
    not_connected_error,
    oauth_configured,
)
from app.core.exceptions import AppException, ErrorCode, ServerError, ValidationError
from app.utils.auth_utils.auth import bearer_token, get_current_user, get_refresh_user

router = APIRouter()

# Where Discogs sends the user back to, once the connection is made or refused
FRONTEND_RETURN_PATH = "/collections"


def get_oauth_service(request: Request, db=Depends(get_db)) -> DiscogsOAuthService:
    return DiscogsOAuthService(DiscogsConnectionRepository(db), request.app.state.http_client)


async def browser_user_id(request: Request, db) -> Optional[int]:
    """
    The Vinyl Keeper user logged in on this browser, or None. Read from the refresh token: after a
    stay on Discogs, the 15 minute access token has often expired, the session has not.
    """
    try:
        return (await get_refresh_user(request, db)).id
    except AppException:
        # No session, an invalid one, or a revoked one: the callback is refused
        return None


@router.get("/connection", response_model=DiscogsConnectionStatus)
async def get_discogs_connection(
    request: Request,
    current_user: User = Depends(get_current_user),
    oauth: DiscogsOAuthService = Depends(get_oauth_service),
):
    """The Discogs account the user connected, if any. No token ever leaves the server."""
    connection = await oauth.repository.get_connection(current_user.id)
    return DiscogsConnectionStatus(
        available=oauth_configured(native=bearer_token(request) is not None),
        connected=connection is not None,
        discogs_username=connection.discogs_username if connection else None,
        connected_at=connection.connected_at if connection else None,
    )


@router.post("/connect", response_model=DiscogsAuthorizeResponse)
async def connect_discogs(
    request: Request,
    current_user: User = Depends(get_current_user),
    oauth: DiscogsOAuthService = Depends(get_oauth_service),
):
    """
    Start the connection: the frontend sends the user to the returned Discogs page. The native app
    (Bearer) gets Discogs to send the user back to its own App Link instead of the browser callback.
    """
    native = bearer_token(request) is not None
    return DiscogsAuthorizeResponse(authorize_url=await oauth.start(current_user, native=native))


@router.post("/oauth/complete", response_model=DiscogsConnectionStatus)
async def complete_discogs_connection(
    data: DiscogsOAuthComplete,
    request: Request,
    current_user: User = Depends(get_current_user),
    oauth: DiscogsOAuthService = Depends(get_oauth_service),
):
    """
    The app is back from Discogs through its App Link and finishes the connection with its own
    session: the authorization must have been started by this very user. A token works once only.
    """
    try:
        await oauth.complete(data.oauth_token, data.oauth_verifier, current_user.id)
    except DiscogsOAuthError as e:
        if e.reason == "unavailable":
            raise ServerError(error_code=ErrorCode.EXTERNAL_SERVICE_ERROR,
                              message="Discogs is not answering, please try again later",
                              details={"reason": e.reason}) from e
        # An expired or refused authorization is a normal outcome (the service logged a refused session)
        error = ValidationError(error_code=ErrorCode.INVALID_INPUT,
                                message="The Discogs connection could not be completed, please start it again",
                                details={"reason": e.reason})
        error.should_log = False
        raise error from e
    return await get_discogs_connection(request, current_user, oauth)


@router.get("/oauth/callback", include_in_schema=False)
async def discogs_oauth_callback(
    request: Request,
    oauth_token: Optional[str] = Query(None, max_length=255),
    oauth_verifier: Optional[str] = Query(None, max_length=255),
    denied: Optional[str] = Query(None, max_length=255),
    oauth: DiscogsOAuthService = Depends(get_oauth_service),
    db=Depends(get_db),
):
    """
    Discogs sends the user back here, a GET navigation from discogs.com: the session cookies come
    with it. The pending request found by its token tells which user asked, and it is completed
    only for that user's browser. A token works once only. Always redirects to the app.
    """
    outcome = "error"
    if denied:
        outcome = "denied"
        await oauth.repository.take_request(denied, timedelta(0))
        await oauth.repository.db.commit()
    elif oauth_token and oauth_verifier:
        try:
            await oauth.complete(oauth_token, oauth_verifier, await browser_user_id(request, db))
            outcome = "connected"
        except DiscogsOAuthError as e:
            outcome = e.reason
        except Exception as e:
            logger.error(f"Discogs OAuth callback failed: {e}", exc_info=True)
    query = urlencode({"discogs": outcome})
    return RedirectResponse(f"{settings.FRONTEND_URL.rstrip('/')}{FRONTEND_RETURN_PATH}?{query}", status_code=303)


@router.delete("/connection", status_code=status.HTTP_204_NO_CONTENT)
async def disconnect_discogs(
    current_user: User = Depends(get_current_user),
    oauth: DiscogsOAuthService = Depends(get_oauth_service),
):
    """Delete the user's Discogs tokens. Discogs has no revocation endpoint: the user may also
    remove VinylKeeper from the authorized applications of their Discogs account."""
    await oauth.disconnect(current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/preview", response_model=DiscogsImportPreview)
async def preview_discogs_collection(
    request: Request,
    current_user: User = Depends(get_current_user),
    repository: DiscogsImportRepository = Depends(get_discogs_import_repository),
    oauth: DiscogsOAuthService = Depends(get_oauth_service),
):
    """Size of the connected Discogs collection and of its wantlist, before importing. Two requests."""
    connection = await oauth.authorization_for(current_user.id)
    if connection is None:
        raise not_connected_error()
    discogs_username, authorization = connection
    # A single attempt: a request worker never waits on Discogs backoff
    client = DiscogsClient(request.app.state.http_client, max_attempts=1, authorization=authorization)
    try:
        preview = await DiscogsImportService(repository, client).preview(discogs_username)
    except DiscogsImportError as e:
        raise_for_preview(e)
    return DiscogsImportPreview(
        discogs_username=discogs_username,
        items_total=preview.items_total,
        wantlist_items_total=preview.wantlist_items_total,
        wantlist_private=preview.wantlist_private,
    )


@router.post("/", response_model=DiscogsImportResponse, status_code=status.HTTP_202_ACCEPTED)
async def start_discogs_import(
    data: DiscogsImportCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    repository: DiscogsImportRepository = Depends(get_discogs_import_repository),
    oauth: DiscogsOAuthService = Depends(get_oauth_service),
):
    """Queue the import of the connected Discogs account: it runs after the response, its progress is
    read on GET /latest."""
    connection = await oauth.repository.get_connection(current_user.id)
    if connection is None:
        raise not_connected_error()
    job = await DiscogsImportService(repository).create_import(
        current_user.id, data.collection_id, connection.discogs_username, save_copy=data.save_copy,
        include_wantlist=data.include_wantlist,
    )
    background_tasks.add_task(run_discogs_imports)
    return job


@router.get("/latest", response_model=Optional[DiscogsImportResponse])
async def get_latest_discogs_import(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    repository: DiscogsImportRepository = Depends(get_discogs_import_repository),
):
    """The latest import of the user (null if none), polled while it runs."""
    job, stalled = await DiscogsImportService(repository).latest_import(current_user.id)
    if stalled:
        # Left by a stopped worker: resumed, already imported records are not added twice
        background_tasks.add_task(run_discogs_imports)
    return job
