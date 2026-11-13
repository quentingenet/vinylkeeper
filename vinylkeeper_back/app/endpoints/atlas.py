from fastapi import APIRouter, BackgroundTasks, Depends, status, Path, Query, Body
from typing import List, Optional
from app.schemas.place_schema import (
    PlaceCreate,
    PlaceUpdate,
    PlaceMapResponse,
    PublicPlaceResponse,
    PlaceTypeResponse,
    PlaceMutationResponse,
)
from app.schemas.place_like_schema import PlaceLikeStatusResponse
from app.schemas.place_report_schema import PlaceReportCreate, PlaceReportCreatedResponse
from app.services.atlas_service import AtlasService
from app.services.place_report_service import PlaceReportService
from app.deps.deps import get_atlas_service, get_place_report_service
from app.utils.auth_utils.auth import get_current_user, get_optional_user
from app.models.user_model import User
from app.core.logging import log_activity

router = APIRouter()


@router.post("/", status_code=status.HTTP_201_CREATED, response_model=PlaceMutationResponse)
async def create_place(
    data: PlaceCreate,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    service: AtlasService = Depends(get_atlas_service)
):
    """Create a new place"""
    place = await service.create_place(data, user, background_tasks)
    log_activity(user.username, f"suggested Atlas spot #{place.id} {place.name!r} ({place.city}, {place.country})")
    return PlaceMutationResponse(message="Spot added to the Atlas", place=place)


@router.get("/map", status_code=status.HTTP_200_OK, response_model=List[PlaceMapResponse])
async def get_map_places(
    user: Optional[User] = Depends(get_optional_user),
    service: AtlasService = Depends(get_atlas_service)
):
    """Moderated spots with coordinates, for the map markers. Open to visitors: the Atlas is public, read only."""
    places = await service.get_map_places()
    return places


@router.get("/by-location", status_code=status.HTTP_200_OK, response_model=List[PublicPlaceResponse])
async def get_places_by_location(
    country: str = Query(..., min_length=1, description="Country name"),
    city: str = Query(..., min_length=1, description="City name"),
    user: Optional[User] = Depends(get_optional_user),
    service: AtlasService = Depends(get_atlas_service)
):
    """Moderated spots of a city, for the map popup. Open to visitors: is_liked is false without a session."""
    places = await service.get_places_by_location(country, city, user)
    return places


@router.get("/place-types", status_code=status.HTTP_200_OK, response_model=List[PlaceTypeResponse])
async def get_place_types(
    service: AtlasService = Depends(get_atlas_service)
):
    """Get all place types (public endpoint)"""
    place_types = await service.get_place_types()
    return [{"id": pt.id, "name": pt.name} for pt in place_types]


@router.patch("/{place_id}", status_code=status.HTTP_200_OK, response_model=PlaceMutationResponse)
async def update_place(
    background_tasks: BackgroundTasks,
    place_id: int = Path(..., gt=0, title="Place ID"),
    data: PlaceUpdate = Body(...),
    user: User = Depends(get_current_user),
    service: AtlasService = Depends(get_atlas_service)
):
    """Update a place"""
    updated_place = await service.update_place(user, place_id, data, background_tasks)
    edited = ", ".join(sorted(data.model_dump(exclude_unset=True)))
    log_activity(user.username, f"edited their Atlas spot #{place_id} ({edited})")
    return PlaceMutationResponse(message="Spot updated", place=updated_place)


@router.post("/{place_id}/like", response_model=PlaceLikeStatusResponse, status_code=status.HTTP_200_OK)
async def like_place(
    place_id: int = Path(..., gt=0, title="Place ID"),
    user: User = Depends(get_current_user),
    service: AtlasService = Depends(get_atlas_service)
):
    """Like a place"""
    result = await service.like_place(user, place_id)
    log_activity(user.username, f"liked Atlas spot #{place_id} ({result['likes_count']} likes)")
    return PlaceLikeStatusResponse(
        place_id=place_id,
        is_liked=True,
        likes_count=result["likes_count"],
        message=result["message"]
    )


@router.delete("/{place_id}/like", response_model=PlaceLikeStatusResponse, status_code=status.HTTP_200_OK)
async def unlike_place(
    place_id: int = Path(..., gt=0, title="Place ID"),
    user: User = Depends(get_current_user),
    service: AtlasService = Depends(get_atlas_service)
):
    """Unlike a place"""
    result = await service.unlike_place(user, place_id)
    return PlaceLikeStatusResponse(
        place_id=place_id,
        is_liked=False,
        likes_count=result["likes_count"],
        message=result["message"]
    )


@router.post("/{place_id}/reports", status_code=status.HTTP_201_CREATED, response_model=PlaceReportCreatedResponse)
async def report_place(
    background_tasks: BackgroundTasks,
    place_id: int = Path(..., gt=0, title="Place ID"),
    data: PlaceReportCreate = Body(...),
    user: User = Depends(get_current_user),
    service: PlaceReportService = Depends(get_place_report_service),
):
    """Report wrong information on a spot (members only): the admins fix it from the admin panel."""
    await service.report_place(user, place_id, data, background_tasks)
    return PlaceReportCreatedResponse(message="Thanks, an admin will check this spot.")
