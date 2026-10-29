from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Query, Request, status

from app.deps.deps import get_discogs_import_repository
from app.models.user_model import User
from app.repositories.discogs_import_repository import DiscogsImportRepository
from app.schemas.discogs_import_schema import (
    DISCOGS_USERNAME_PATTERN,
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
from app.utils.auth_utils.auth import get_current_user
from app.utils.endpoint_utils import handle_app_exceptions

router = APIRouter()


@router.get("/preview", response_model=DiscogsImportPreview)
@handle_app_exceptions
async def preview_discogs_collection(
    request: Request,
    discogs_username: str = Query(..., pattern=DISCOGS_USERNAME_PATTERN, description="Discogs username"),
    current_user: User = Depends(get_current_user),
    repository: DiscogsImportRepository = Depends(get_discogs_import_repository),
):
    """Size of a public Discogs collection, before importing it. One request to Discogs."""
    # A single attempt: a request worker never waits on Discogs backoff
    client = DiscogsClient(request.app.state.http_client, max_attempts=1)
    try:
        items_total = await DiscogsImportService(repository, client).preview(discogs_username)
    except DiscogsImportError as e:
        raise_for_preview(e)
    return DiscogsImportPreview(discogs_username=discogs_username, items_total=items_total)


@router.post("/", response_model=DiscogsImportResponse, status_code=status.HTTP_202_ACCEPTED)
@handle_app_exceptions
async def start_discogs_import(
    data: DiscogsImportCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    repository: DiscogsImportRepository = Depends(get_discogs_import_repository),
):
    """Queue the import: it runs after the response, its progress is read on GET /latest."""
    job = await DiscogsImportService(repository).create_import(
        current_user.id, data.collection_id, data.discogs_username, save_copy=data.save_copy
    )
    background_tasks.add_task(run_discogs_imports)
    return job


@router.get("/latest", response_model=Optional[DiscogsImportResponse])
@handle_app_exceptions
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
