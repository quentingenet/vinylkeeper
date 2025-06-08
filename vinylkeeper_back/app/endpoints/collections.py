from fastapi import APIRouter, Depends, status, Path, Query
from app.schemas.collection_schema import (
    CollectionCreate,
    CollectionDetailResponse,
    CollectionUpdate,
    CollectionResponse,
)
from app.schemas.like_schema import LikeStatusResponse
from app.services.collection_service import CollectionService
from app.deps.deps import get_collection_service
from app.utils.auth_utils.auth import get_current_user
from app.core.logging import logger
from app.schemas.user_schema import UserMiniResponse

router = APIRouter()


@router.post("/add", status_code=status.HTTP_201_CREATED)
def create_collection(
    data: CollectionCreate,
    user=Depends(get_current_user),
    service: CollectionService = Depends(get_collection_service)
):
    collection = service.create_collection(data, user.id)
    logger.info(
        f"Collection created: {collection.name} by user {user.username}")
    return {"message": "Collection created successfully"}


@router.get("/", status_code=status.HTTP_200_OK)
def get_user_collections(
    user=Depends(get_current_user),
    service: CollectionService = Depends(get_collection_service),
    page: int = Query(1, gt=0),
    limit: int = Query(10, gt=0, le=100)
):
    collections, total = service.get_user_collections(user.id, page, limit)
    items = []
    for c in collections:
        data = c.__dict__.copy() if hasattr(c, "__dict__") else dict(c)
        if "owner" in data and data["owner"]:
            data["owner"] = UserMiniResponse.model_validate(data["owner"])
        items.append(CollectionResponse.model_validate(data).model_dump())
    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }


@router.get("/public", status_code=status.HTTP_200_OK)
def get_public_collections(
    user=Depends(get_current_user),
    service: CollectionService = Depends(get_collection_service),
    page: int = Query(1, gt=0),
    limit: int = Query(10, gt=0, le=100)
):
    collections, total = service.get_public_collections(
        page, limit, exclude_user_id=user.id)
    items = []
    for c in collections:
        data = c.__dict__.copy() if hasattr(c, "__dict__") else dict(c)
        if "owner" in data and data["owner"]:
            data["owner"] = UserMiniResponse.model_validate(data["owner"])
        items.append(CollectionResponse.model_validate(data).model_dump())
    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }


@router.get("/{collection_id}", status_code=status.HTTP_200_OK)
def get_collection_by_id(
    collection_id: int = Path(..., gt=0, title="Collection ID"),
    user=Depends(get_current_user),
    service: CollectionService = Depends(get_collection_service),
):
    collection = service.get_collection_by_id(collection_id, user.id)
    data = collection.__dict__.copy() if hasattr(
        collection, "__dict__") else dict(collection)
    if "owner" in data and data["owner"]:
        data["owner"] = UserMiniResponse.model_validate(data["owner"])
    return CollectionResponse.model_validate(data).model_dump()


@router.patch("/area/{collection_id}", status_code=status.HTTP_200_OK)
def switch_area_collection(
    collection_id: int = Path(..., gt=0),
    is_public: bool = Query(...),
    user=Depends(get_current_user),
    service: CollectionService = Depends(get_collection_service),
):
    updated = service.update_collection_area(collection_id, is_public, user.id)
    if not updated:
        return {"message": "Failed to update collection area"}
    return {"message": "Collection updated successfully"}


@router.patch("/update/{collection_id}", status_code=status.HTTP_200_OK)
def update_collection(
    collection_id: int = Path(..., gt=0, title="Collection ID"),
    data: CollectionUpdate = None,
    user=Depends(get_current_user),
    service: CollectionService = Depends(get_collection_service),
):
    updated = service.update_collection(collection_id, data, user.id)
    if not updated:
        return {"message": "Failed to update collection"}
    logger.info(
        f"Collection updated: id={collection_id} by user {user.username}")
    return {"message": "Collection updated successfully"}


@router.delete("/{collection_id}", status_code=status.HTTP_200_OK)
def delete_collection(
    collection_id: int = Path(..., gt=0, title="Collection ID"),
    user=Depends(get_current_user),
    service: CollectionService = Depends(get_collection_service),
):
    deleted = service.delete_collection(collection_id, user.id)
    if not deleted:
        return {"message": "Failed to delete collection"}
    logger.info(
        f"Collection deleted: id={collection_id} by user {user.username}")
    return {"message": "Collection deleted successfully"}


@router.get("/{collection_id}/details", status_code=status.HTTP_200_OK)
def get_collection_details(
    collection_id: int = Path(..., gt=0, title="Collection ID"),
    user=Depends(get_current_user),
    service: CollectionService = Depends(get_collection_service),
):
    details = service.get_collection_by_id(collection_id, user.id)
    data = details.__dict__.copy() if hasattr(
        details, "__dict__") else dict(details)
    if "owner" in data and data["owner"]:
        data["owner"] = UserMiniResponse.model_validate(data["owner"])
    return CollectionDetailResponse.model_validate(data).model_dump()


@router.delete("/{collection_id}/albums/{album_id}", status_code=status.HTTP_200_OK)
def remove_album_from_collection(
    collection_id: int = Path(..., gt=0, title="Collection ID"),
    album_id: int = Path(..., gt=0, title="Album ID"),
    user=Depends(get_current_user),
    service: CollectionService = Depends(get_collection_service),
):
    success = service.remove_album_from_collection(
        collection_id, album_id, user.id)
    return {"success": success, "message": "Album removed from collection successfully"}


@router.delete("/{collection_id}/artists/{artist_id}", status_code=status.HTTP_200_OK)
def remove_artist_from_collection(
    collection_id: int = Path(..., gt=0, title="Collection ID"),
    artist_id: int = Path(..., gt=0, title="Artist ID"),
    user=Depends(get_current_user),
    service: CollectionService = Depends(get_collection_service),
):
    success = service.remove_artist_from_collection(
        collection_id, artist_id, user.id)
    return {"success": success, "message": "Artist removed from collection successfully"}


@router.post("/{collection_id}/like", status_code=status.HTTP_200_OK)
def like_collection(
    collection_id: int = Path(..., gt=0, title="Collection ID"),
    user=Depends(get_current_user),
    service: CollectionService = Depends(get_collection_service),
):
    result = service.like_collection(collection_id, user.id)
    return {"liked": result}


@router.delete("/{collection_id}/like", status_code=status.HTTP_200_OK)
def unlike_collection(
    collection_id: int = Path(..., gt=0, title="Collection ID"),
    user=Depends(get_current_user),
    service: CollectionService = Depends(get_collection_service),
):
    result = service.unlike_collection(collection_id, user.id)
    return {"unliked": result}


@router.get("/{collection_id}/like-status", response_model=LikeStatusResponse)
def get_like_status(
    collection_id: int = Path(..., gt=0, title="Collection ID"),
    user=Depends(get_current_user),
    service: CollectionService = Depends(get_collection_service),
):
    status = service.get_like_status(collection_id, user.id)
    return LikeStatusResponse(**status)
