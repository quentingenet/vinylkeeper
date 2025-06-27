from fastapi import APIRouter, Depends, status, Path, Query, Body, HTTPException
from typing import List, Optional
from sqlalchemy.orm import Session

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
from app.core.logging import logger
from app.core.exceptions import (
    ResourceNotFoundError,
    ForbiddenError,
    DuplicateFieldError,
    AppException,
    ValidationError,
    ServerError,
)

router = APIRouter()


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_place(
    data: PlaceCreate,
    user: User = Depends(get_current_user),
    service: PlaceService = Depends(get_place_service)
):
    """Create a new place"""
    try:
        place = await service.create_place(data, user.id)
        return {"message": "Place created successfully", "place": place.model_dump()}
    except DuplicateFieldError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail["message"])
    except Exception as e:
        logger.error(f"Unexpected error creating place: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/", status_code=status.HTTP_200_OK)
def get_places(
    user: User = Depends(get_current_user),
    service: PlaceService = Depends(get_place_service),
    limit: Optional[int] = Query(None, gt=0, le=100),
    offset: Optional[int] = Query(None, ge=0)
):
    """Get all places with optional pagination (only moderated places)"""
    try:
        places = service.get_all_places(user.id, limit, offset)
        return [place.model_dump() for place in places]
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail["message"])
    except Exception as e:
        logger.error(f"Unexpected error getting places: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{place_id}", status_code=status.HTTP_200_OK)
def get_place_by_id(
    place_id: int = Path(..., gt=0, title="Place ID"),
    user: User = Depends(get_current_user),
    service: PlaceService = Depends(get_place_service)
):
    """Get a place by ID (only moderated places)"""
    try:
        place = service.get_place(place_id, user.id)
        return place.model_dump()
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail["message"])
    except Exception as e:
        logger.error(f"Unexpected error getting place: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.patch("/{place_id}", status_code=status.HTTP_200_OK)
def update_place(
    place_id: int = Path(..., gt=0, title="Place ID"),
    data: PlaceUpdate = Body(...),
    user: User = Depends(get_current_user),
    service: PlaceService = Depends(get_place_service)
):
    """Update a place"""
    try:
        updated_place = service.update_place(user.id, place_id, data)
        return {"message": "Place updated successfully", "place": updated_place.model_dump()}
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ForbiddenError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except DuplicateFieldError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail["message"])
    except Exception as e:
        logger.error(f"Unexpected error updating place: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/{place_id}", status_code=status.HTTP_200_OK)
def delete_place(
    place_id: int = Path(..., gt=0, title="Place ID"),
    user: User = Depends(get_current_user),
    service: PlaceService = Depends(get_place_service)
):
    """Delete a place"""
    try:
        deleted = service.delete_place(user.id, place_id)
        return {"message": "Place deleted successfully"}
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ForbiddenError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail["message"])
    except Exception as e:
        logger.error(f"Unexpected error deleting place: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/{place_id}/like", response_model=PlaceLikeStatusResponse, status_code=status.HTTP_200_OK)
def like_place(
    place_id: int = Path(..., gt=0, title="Place ID"),
    user: User = Depends(get_current_user),
    service: PlaceService = Depends(get_place_service)
):
    """Like a place"""
    try:
        result = service.like_place(user.id, place_id)
        return PlaceLikeStatusResponse(
            place_id=place_id,
            liked=True,
            is_liked=True,
            likes_count=result["likes_count"],
            message=result["message"]
        )
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail["message"])
    except Exception as e:
        logger.error(f"Unexpected error liking place: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/{place_id}/like", response_model=PlaceLikeStatusResponse, status_code=status.HTTP_200_OK)
def unlike_place(
    place_id: int = Path(..., gt=0, title="Place ID"),
    user: User = Depends(get_current_user),
    service: PlaceService = Depends(get_place_service)
):
    """Unlike a place"""
    try:
        result = service.unlike_place(user.id, place_id)
        return PlaceLikeStatusResponse(
            place_id=place_id,
            liked=False,
            is_liked=False,
            likes_count=result["likes_count"],
            message=result["message"]
        )
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail["message"])
    except Exception as e:
        logger.error(f"Unexpected error unliking place: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/search", status_code=status.HTTP_200_OK)
def search_places(
    q: str = Query(..., min_length=1, description="Search term"),
    user: User = Depends(get_current_user),
    service: PlaceService = Depends(get_place_service)
):
    """Search places by name, city, or country"""
    try:
        places = service.search_places(q, user.id)
        return {
            "items": [place.model_dump() for place in places],
            "total": len(places),
            "search_term": q
        }
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail["message"])
    except Exception as e:
        logger.error(f"Unexpected error searching places: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/type/{place_type_id}", status_code=status.HTTP_200_OK)
def get_places_by_type(
    place_type_id: int = Path(..., gt=0, title="Place Type ID"),
    user: User = Depends(get_current_user),
    service: PlaceService = Depends(get_place_service)
):
    """Get all places of a specific type"""
    try:
        places = service.get_places_by_type(place_type_id, user.id)
        return {
            "items": [place.model_dump() for place in places],
            "total": len(places),
            "place_type_id": place_type_id
        }
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail["message"])
    except Exception as e:
        logger.error(f"Unexpected error getting places by type: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/region", status_code=status.HTTP_200_OK)
def get_places_in_region(
    min_lat: float = Query(..., ge=-90, le=90, description="Minimum latitude"),
    max_lat: float = Query(..., ge=-90, le=90, description="Maximum latitude"),
    min_lng: float = Query(..., ge=-180, le=180, description="Minimum longitude"),
    max_lng: float = Query(..., ge=-180, le=180, description="Maximum longitude"),
    user: User = Depends(get_current_user),
    service: PlaceService = Depends(get_place_service)
):
    """Get places within a geographic region"""
    try:
        places = service.get_places_in_region(min_lat, max_lat, min_lng, max_lng, user.id)
        return {
            "items": [place.model_dump() for place in places],
            "total": len(places),
            "bounds": {
                "min_lat": min_lat,
                "max_lat": max_lat,
                "min_lng": min_lng,
                "max_lng": max_lng
            }
        }
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail["message"])
    except Exception as e:
        logger.error(f"Unexpected error getting places in region: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/place-types", status_code=status.HTTP_200_OK)
def get_place_types(
    db: Session = Depends(get_db)
):
    """Get all place types"""
    try:
        place_types = db.query(PlaceType).all()
        return {
            "items": [
                {
                    "id": pt.id,
                    "name": pt.name
                } for pt in place_types
            ],
            "total": len(place_types)
        }
    except Exception as e:
        logger.error(f"Unexpected error getting place types: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error") 