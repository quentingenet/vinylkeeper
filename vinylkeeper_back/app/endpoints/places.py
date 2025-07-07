from fastapi import APIRouter, Depends, status, Path, Query, Body
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.place_schema import (
    PlaceCreate,
    PlaceUpdate,
    PlaceResponse,
    PublicPlaceResponse
)
from app.schemas.place_like_schema import PlaceLikeStatusResponse
from app.services.place_service import PlaceService
from app.deps.deps import get_place_service, get_db
from app.utils.auth_utils.auth import get_current_user
from app.models.user_model import User
from app.models.reference_data.place_types import PlaceType
from app.core.exceptions import (
    ResourceNotFoundError,
    ForbiddenError,
    DuplicateFieldError,
    AppException,
    ValidationError,
    ServerError,
)
from app.utils.endpoint_utils import handle_app_exceptions

router = APIRouter()


@router.post("/", status_code=status.HTTP_201_CREATED)
@handle_app_exceptions
async def create_place(
    data: PlaceCreate,
    user: User = Depends(get_current_user),
    service: PlaceService = Depends(get_place_service)
):
    """Create a new place"""
    place = await service.create_place(data, user.id)
    return {"message": "Place created successfully", "place": place.model_dump()}


@router.get("/", status_code=status.HTTP_200_OK)
@handle_app_exceptions
async def get_places(
    user: User = Depends(get_current_user),
    service: PlaceService = Depends(get_place_service),
    limit: Optional[int] = Query(None, gt=0, le=100),
    offset: Optional[int] = Query(None, ge=0)
):
    """Get all places with optional pagination (only moderated places)"""
    places = await service.get_all_places(user.id, limit, offset)
    return [place.model_dump() for place in places]


@router.get("/place-types", status_code=status.HTTP_200_OK)
async def get_place_types(
    db: AsyncSession = Depends(get_db)
):
    """Get all place types (public endpoint)"""
    from app.models.reference_data.place_types import PlaceType as PlaceTypeModel
    from sqlalchemy import select
    result = await db.execute(select(PlaceTypeModel))
    place_types = result.scalars().all()
    return [{"id": pt.id, "name": pt.name} for pt in place_types]


@router.get("/{place_id}", status_code=status.HTTP_200_OK)
@handle_app_exceptions
async def get_place_by_id(
    place_id: int = Path(..., gt=0, title="Place ID"),
    user: User = Depends(get_current_user),
    service: PlaceService = Depends(get_place_service)
):
    """Get a place by ID (only moderated places)"""
    place = await service.get_place(place_id, user.id)
    return place.model_dump()


@router.patch("/{place_id}", status_code=status.HTTP_200_OK)
@handle_app_exceptions
async def update_place(
    place_id: int = Path(..., gt=0, title="Place ID"),
    data: PlaceUpdate = Body(...),
    user: User = Depends(get_current_user),
    service: PlaceService = Depends(get_place_service)
):
    """Update a place"""
    updated_place = await service.update_place(user.id, place_id, data)
    return {"message": "Place updated successfully", "place": updated_place.model_dump()}


@router.delete("/{place_id}", status_code=status.HTTP_200_OK)
@handle_app_exceptions
async def delete_place(
    place_id: int = Path(..., gt=0, title="Place ID"),
    user: User = Depends(get_current_user),
    service: PlaceService = Depends(get_place_service)
):
    """Delete a place"""
    deleted = await service.delete_place(user.id, place_id)
    return {"message": "Place deleted successfully"}


@router.post("/{place_id}/like", response_model=PlaceLikeStatusResponse, status_code=status.HTTP_200_OK)
@handle_app_exceptions
async def like_place(
    place_id: int = Path(..., gt=0, title="Place ID"),
    user: User = Depends(get_current_user),
    service: PlaceService = Depends(get_place_service)
):
    """Like a place"""
    result = await service.like_place(user.id, place_id)
    return PlaceLikeStatusResponse(
        place_id=place_id,
        liked=True,
        is_liked=True,
        likes_count=result["likes_count"],
        message=result["message"]
    )


@router.delete("/{place_id}/like", response_model=PlaceLikeStatusResponse, status_code=status.HTTP_200_OK)
@handle_app_exceptions
async def unlike_place(
    place_id: int = Path(..., gt=0, title="Place ID"),
    user: User = Depends(get_current_user),
    service: PlaceService = Depends(get_place_service)
):
    """Unlike a place"""
    result = await service.unlike_place(user.id, place_id)
    return PlaceLikeStatusResponse(
        place_id=place_id,
        liked=False,
        is_liked=False,
        likes_count=result["likes_count"],
        message=result["message"]
    )


@router.get("/search", status_code=status.HTTP_200_OK)
@handle_app_exceptions
async def search_places(
    q: str = Query(..., min_length=1, description="Search term"),
    user: User = Depends(get_current_user),
    service: PlaceService = Depends(get_place_service)
):
    """Search places by name, city, or country"""
    places = await service.search_places(q, user.id)
    return {
        "items": [place.model_dump() for place in places],
        "total": len(places),
        "search_term": q
    }


@router.get("/type/{place_type_id}", status_code=status.HTTP_200_OK)
@handle_app_exceptions
async def get_places_by_type(
    place_type_id: int = Path(..., gt=0, title="Place Type ID"),
    user: User = Depends(get_current_user),
    service: PlaceService = Depends(get_place_service)
):
    """Get places by type"""
    places = await service.get_places_by_type(place_type_id, user.id)
    return {
        "items": [place.model_dump() for place in places],
        "total": len(places),
        "place_type_id": place_type_id
    }


@router.get("/region", status_code=status.HTTP_200_OK)
@handle_app_exceptions
async def get_places_in_region(
    min_lat: float = Query(..., ge=-90, le=90, description="Minimum latitude"),
    max_lat: float = Query(..., ge=-90, le=90, description="Maximum latitude"),
    min_lng: float = Query(..., ge=-180, le=180, description="Minimum longitude"),
    max_lng: float = Query(..., ge=-180, le=180, description="Maximum longitude"),
    user: User = Depends(get_current_user),
    service: PlaceService = Depends(get_place_service)
):
    """Get places within a geographic region"""
    places = await service.get_places_in_region(min_lat, max_lat, min_lng, max_lng, user.id)
    return {
        "items": [place.model_dump() for place in places],
        "total": len(places),
        "region": {
            "min_lat": min_lat,
            "max_lat": max_lat,
            "min_lng": min_lng,
            "max_lng": max_lng
        }
    } 