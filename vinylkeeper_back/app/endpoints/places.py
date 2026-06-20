from fastapi import APIRouter, Depends, status, Path, Query, Body
from typing import List
from app.schemas.place_schema import (
    PlaceCreate,
    PlaceUpdate,
    PaginatedPlaceResponse,
    PlaceMapResponse,
    PublicPlaceResponse,
    PlaceTypeResponse,
    PlaceMutationResponse,
)
from app.schemas.place_like_schema import PlaceLikeStatusResponse
from app.services.place_service import PlaceService
from app.deps.deps import get_place_service
from app.utils.auth_utils.auth import get_current_user
from app.models.user_model import User
from app.utils.endpoint_utils import handle_app_exceptions

router = APIRouter()


@router.post("/", status_code=status.HTTP_201_CREATED, response_model=PlaceMutationResponse)
@handle_app_exceptions
async def create_place(
    data: PlaceCreate,
    user: User = Depends(get_current_user),
    service: PlaceService = Depends(get_place_service)
):
    """Create a new place"""
    place = await service.create_place(data, user)
    return PlaceMutationResponse(message="Place created successfully", place=place)


@router.get("/", response_model=PaginatedPlaceResponse, status_code=status.HTTP_200_OK)
@handle_app_exceptions
async def get_places(
    user: User = Depends(get_current_user),
    service: PlaceService = Depends(get_place_service),
    page: int = Query(1, gt=0, description="Page number"),
    limit: int = Query(20, gt=0, le=100, description="Items per page"),
):
    """Get all moderated places with pagination."""
    return await service.get_all_places(user, page, limit)


@router.get("/map", status_code=status.HTTP_200_OK, response_model=List[PlaceMapResponse])
@handle_app_exceptions
async def get_map_places(
    user: User = Depends(get_current_user),
    service: PlaceService = Depends(get_place_service)
):
    """Get all moderated places with coordinates for map markers (ultra-lightweight response)."""
    places = await service.get_map_places()
    return places


@router.get("/by-location", status_code=status.HTTP_200_OK, response_model=List[PublicPlaceResponse])
@handle_app_exceptions
async def get_places_by_location(
    country: str = Query(..., min_length=1, description="Country name"),
    city: str = Query(..., min_length=1, description="City name"),
    user: User = Depends(get_current_user),
    service: PlaceService = Depends(get_place_service)
):
    """Get all moderated places in the given country and city (for map popup)."""
    places = await service.get_places_by_location(country, city, user)
    return [place.model_dump() for place in places]


@router.get("/place-types", status_code=status.HTTP_200_OK, response_model=List[PlaceTypeResponse])
@handle_app_exceptions
async def get_place_types(
    service: PlaceService = Depends(get_place_service)
):
    """Get all place types (public endpoint)"""
    place_types = await service.get_place_types()
    return [{"id": pt.id, "name": pt.name} for pt in place_types]


@router.get("/search", response_model=PaginatedPlaceResponse, status_code=status.HTTP_200_OK)
@handle_app_exceptions
async def search_places(
    q: str = Query(..., min_length=1, description="Search term"),
    user: User = Depends(get_current_user),
    service: PlaceService = Depends(get_place_service),
    page: int = Query(1, gt=0, description="Page number"),
    limit: int = Query(20, gt=0, le=100, description="Items per page"),
):
    """Search places by name, city, or country."""
    return await service.search_places(q, user, page, limit)


@router.get("/type/{place_type_id}", response_model=PaginatedPlaceResponse, status_code=status.HTTP_200_OK)
@handle_app_exceptions
async def get_places_by_type(
    place_type_id: int = Path(..., gt=0, title="Place Type ID"),
    user: User = Depends(get_current_user),
    service: PlaceService = Depends(get_place_service),
    page: int = Query(1, gt=0, description="Page number"),
    limit: int = Query(20, gt=0, le=100, description="Items per page"),
):
    """Get places by type."""
    return await service.get_places_by_type(place_type_id, user, page, limit)


@router.get("/region", response_model=PaginatedPlaceResponse, status_code=status.HTTP_200_OK)
@handle_app_exceptions
async def get_places_in_region(
    min_lat: float = Query(..., ge=-90, le=90, description="Minimum latitude"),
    max_lat: float = Query(..., ge=-90, le=90, description="Maximum latitude"),
    min_lng: float = Query(..., ge=-180, le=180, description="Minimum longitude"),
    max_lng: float = Query(..., ge=-180, le=180, description="Maximum longitude"),
    user: User = Depends(get_current_user),
    service: PlaceService = Depends(get_place_service),
    page: int = Query(1, gt=0, description="Page number"),
    limit: int = Query(20, gt=0, le=100, description="Items per page"),
):
    """Get places within a geographic region."""
    return await service.get_places_in_region(min_lat, max_lat, min_lng, max_lng, user, page, limit)


@router.get("/{place_id}", status_code=status.HTTP_200_OK, response_model=PublicPlaceResponse)
@handle_app_exceptions
async def get_place_by_id(
    place_id: int = Path(..., gt=0, title="Place ID"),
    user: User = Depends(get_current_user),
    service: PlaceService = Depends(get_place_service)
):
    """Get a place by ID (only moderated places)"""
    place = await service.get_place(place_id, user)
    return place.model_dump()


@router.patch("/{place_id}", status_code=status.HTTP_200_OK, response_model=PlaceMutationResponse)
@handle_app_exceptions
async def update_place(
    place_id: int = Path(..., gt=0, title="Place ID"),
    data: PlaceUpdate = Body(...),
    user: User = Depends(get_current_user),
    service: PlaceService = Depends(get_place_service)
):
    """Update a place"""
    updated_place = await service.update_place(user, place_id, data)
    return PlaceMutationResponse(message="Place updated successfully", place=updated_place)


@router.delete("/{place_id}", status_code=status.HTTP_204_NO_CONTENT)
@handle_app_exceptions
async def delete_place(
    place_id: int = Path(..., gt=0, title="Place ID"),
    user: User = Depends(get_current_user),
    service: PlaceService = Depends(get_place_service)
):
    """Delete a place"""
    await service.delete_place(user, place_id)


@router.post("/{place_id}/like", response_model=PlaceLikeStatusResponse, status_code=status.HTTP_200_OK)
@handle_app_exceptions
async def like_place(
    place_id: int = Path(..., gt=0, title="Place ID"),
    user: User = Depends(get_current_user),
    service: PlaceService = Depends(get_place_service)
):
    """Like a place"""
    result = await service.like_place(user, place_id)
    return PlaceLikeStatusResponse(
        place_id=place_id,
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
    result = await service.unlike_place(user, place_id)
    return PlaceLikeStatusResponse(
        place_id=place_id,
        is_liked=False,
        likes_count=result["likes_count"],
        message=result["message"]
    )
