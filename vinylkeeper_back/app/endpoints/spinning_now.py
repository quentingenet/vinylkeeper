from fastapi import APIRouter, Depends, Query

from app.deps.deps import get_spinning_now_service
from app.schemas.spinning_now_schema import SpinningNowOptionsResponse, SpinningNowResponse
from app.services.spinning_now_service import DEFAULT_LIMIT, SpinningNowService
from app.utils.auth_utils.auth import get_current_user
from app.utils.endpoint_utils import handle_app_exceptions

router = APIRouter()


@router.get("/options", response_model=SpinningNowOptionsResponse)
@handle_app_exceptions
async def get_spinning_now_options(
    service: SpinningNowService = Depends(get_spinning_now_service),
    user=Depends(get_current_user),
):
    """Moods, eras, genres and collections of the user that hold albums, with album counts."""
    return await service.get_options(user.id)


@router.get("/", response_model=SpinningNowResponse)
@handle_app_exceptions
async def pick_spinning_now(
    moods: list[str] = Query(default=[], description="Any of these moods"),
    eras: list[int] = Query(default=[], description="Any of these decades, e.g. 1970"),
    genres: list[str] = Query(default=[], description="Any of these genres"),
    collections: list[int] = Query(default=[], description="Any of these collections (ids of the user's own)"),
    limit: int = Query(DEFAULT_LIMIT, description="Number of random albums to return"),
    service: SpinningNowService = Depends(get_spinning_now_service),
    user=Depends(get_current_user),
):
    """Random albums of the user's collections matching the filters."""
    return await service.pick(user.id, moods, eras, genres, collections, limit)
