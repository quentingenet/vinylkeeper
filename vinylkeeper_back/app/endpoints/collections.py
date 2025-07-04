from fastapi import APIRouter, Depends, status, Path, Query, Body, HTTPException
from app.schemas.collection_schema import (
    CollectionCreate,
    CollectionDetailResponse,
    CollectionUpdate,
    CollectionResponse,
    CollectionVisibilityUpdate,
    PaginatedAlbumsResponse,
    PaginatedArtistsResponse
)
from app.schemas.like_schema import LikeStatusResponse
from app.services.collection_service import CollectionService
from app.deps.deps import get_collection_service
from app.utils.auth_utils.auth import get_current_user
from app.models.user_model import User
from app.core.logging import logger
from app.core.exceptions import (
    ResourceNotFoundError,
    ForbiddenError,
    DuplicateFieldError,
    AppException,
    ValidationError,
    ServerError,
)
from app.schemas.collection_album_schema import CollectionAlbumUpdate, CollectionAlbumMetadataResponse

router = APIRouter()


@router.post("/add", status_code=status.HTTP_201_CREATED)
def create_collection(
    data: CollectionCreate,
    user=Depends(get_current_user),
    service: CollectionService = Depends(get_collection_service)
):
    try:
        collection = service.create_collection(data, user.id)
        return {"message": "Collection created successfully"}
    except DuplicateFieldError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail["message"])
    except Exception as e:
        logger.error(f"Unexpected error creating collection: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/", status_code=status.HTTP_200_OK)
def get_user_collections(
    user=Depends(get_current_user),
    service: CollectionService = Depends(get_collection_service),
    page: int = Query(1, gt=0),
    limit: int = Query(10, gt=0, le=100)
):
    try:
        collections, total = service.get_user_collections(user.id, page, limit)
        
        # Serialize collections with error handling
        items = []
        for i, collection in enumerate(collections):
            try:
                items.append(collection.model_dump())
            except Exception as e:
                continue
        
        return {
            "items": items,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit
        }
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail["message"])
    except Exception as e:
        logger.error(f"Unexpected error getting user collections: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/public", status_code=status.HTTP_200_OK)
def get_public_collections(
    user=Depends(get_current_user),
    service: CollectionService = Depends(get_collection_service),
    page: int = Query(1, gt=0),
    limit: int = Query(10, gt=0, le=100)
):
    try:
        collections, total = service.get_public_collections(page, limit, exclude_user_id=user.id)
        return {
            "items": [c.model_dump() for c in collections],
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit
        }
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail["message"])
    except Exception as e:
        logger.error(f"Unexpected error getting public collections: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{collection_id}", status_code=status.HTTP_200_OK)
def get_collection_by_id(
    collection_id: int = Path(..., gt=0, title="Collection ID"),
    user=Depends(get_current_user),
    service: CollectionService = Depends(get_collection_service),
):
    collection = service.get_collection_by_id(collection_id, user.id)
    return CollectionResponse.model_validate(collection).model_dump()


@router.patch("/area/{collection_id}", status_code=status.HTTP_200_OK)
def switch_area_collection(
    collection_id: int = Path(..., gt=0),
    data: CollectionVisibilityUpdate = Body(...),
    user=Depends(get_current_user),
    service: CollectionService = Depends(get_collection_service),
):
    try:
        updated = service.update_collection(
            user.id,
            collection_id,
            CollectionUpdate(is_public=data.is_public)
        )
        if not updated:
            raise HTTPException(
                status_code=400, detail="Failed to update collection visibility")
        return {"message": "Collection visibility updated successfully"}
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ForbiddenError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error updating collection visibility: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.patch("/update/{collection_id}", status_code=status.HTTP_200_OK)
def update_collection(
    collection_id: int = Path(..., gt=0, title="Collection ID"),
    data: CollectionUpdate = Body(...),
    user=Depends(get_current_user),
    service: CollectionService = Depends(get_collection_service),
):
    try:
        updated = service.update_collection(user.id, collection_id, data)
        if not updated:
            raise HTTPException(
                status_code=400, detail="Failed to update collection")
        return {"message": "Collection updated successfully"}
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ForbiddenError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except DuplicateFieldError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error updating collection: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/{collection_id}", status_code=status.HTTP_200_OK)
def delete_collection(
    collection_id: int = Path(..., gt=0, title="Collection ID"),
    user=Depends(get_current_user),
    service: CollectionService = Depends(get_collection_service),
):
    try:
        deleted = service.delete_collection(user.id, collection_id)
        return {"message": "Collection deleted successfully"}
    except ForbiddenError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error deleting collection: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{collection_id}/details", status_code=status.HTTP_200_OK)
def get_collection_details(
    collection_id: int = Path(..., gt=0, title="Collection ID"),
    user=Depends(get_current_user),
    service: CollectionService = Depends(get_collection_service),
):
    details = service.get_collection_by_id(collection_id, user.id)
    return CollectionDetailResponse.model_validate(details).model_dump()


@router.get("/{collection_id}/albums", status_code=status.HTTP_200_OK)
def get_collection_albums_paginated(
    collection_id: int = Path(..., gt=0, title="Collection ID"),
    page: int = Query(1, gt=0, description="Page number"),
    limit: int = Query(12, gt=0, le=50, description="Number of items per page"),
    user=Depends(get_current_user),
    service: CollectionService = Depends(get_collection_service),
):
    """Get paginated albums for a collection."""
    try:
        result = service.get_collection_albums_paginated(collection_id, user.id, page, limit)
        return PaginatedAlbumsResponse.model_validate(result).model_dump()
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail["message"])
    except Exception as e:
        logger.error(f"Unexpected error getting collection albums: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{collection_id}/artists", status_code=status.HTTP_200_OK)
def get_collection_artists_paginated(
    collection_id: int = Path(..., gt=0, title="Collection ID"),
    page: int = Query(1, gt=0, description="Page number"),
    limit: int = Query(12, gt=0, le=50, description="Number of items per page"),
    user=Depends(get_current_user),
    service: CollectionService = Depends(get_collection_service),
):
    """Get paginated artists for a collection."""
    try:
        result = service.get_collection_artists_paginated(collection_id, user.id, page, limit)
        return PaginatedArtistsResponse.model_validate(result).model_dump()
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail["message"])
    except Exception as e:
        logger.error(f"Unexpected error getting collection artists: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/{collection_id}/albums/{album_id}", status_code=status.HTTP_200_OK)
def remove_album_from_collection(
    collection_id: int = Path(..., gt=0, title="Collection ID"),
    album_id: int = Path(..., gt=0, title="Album ID"),
    user=Depends(get_current_user),
    service: CollectionService = Depends(get_collection_service),
):
    success = service.remove_album_from_collection(
        user.id, collection_id, album_id)
    return {"success": success, "message": "Album removed from collection successfully"}


@router.delete("/{collection_id}/artists/{artist_id}", status_code=status.HTTP_200_OK)
def remove_artist_from_collection(
    collection_id: int = Path(..., gt=0, title="Collection ID"),
    artist_id: int = Path(..., gt=0, title="Artist ID"),
    user=Depends(get_current_user),
    service: CollectionService = Depends(get_collection_service),
):
    success = service.remove_artist_from_collection(
        user.id, collection_id, artist_id)
    return {"success": success, "message": "Artist removed from collection successfully"}


@router.post("/{collection_id}/like", response_model=LikeStatusResponse, status_code=status.HTTP_200_OK)
def like_collection(
    collection_id: int = Path(..., gt=0, title="Collection ID"),
    user=Depends(get_current_user),
    service: CollectionService = Depends(get_collection_service),
):
    status = service.like_collection(user.id, collection_id)
    return LikeStatusResponse(**status)


@router.delete("/{collection_id}/like", response_model=LikeStatusResponse, status_code=status.HTTP_200_OK)
def unlike_collection(
    collection_id: int = Path(..., gt=0, title="Collection ID"),
    user=Depends(get_current_user),
    service: CollectionService = Depends(get_collection_service),
):
    status = service.unlike_collection(user.id, collection_id)
    return LikeStatusResponse(**status)


@router.patch("/{collection_id}/albums/{album_id}/metadata", response_model=CollectionAlbumMetadataResponse)
def update_album_metadata(
    collection_id: int,
    album_id: int,
    data: CollectionAlbumUpdate,
    current_user: User = Depends(get_current_user),
    service: CollectionService = Depends(get_collection_service)
) -> CollectionAlbumMetadataResponse:
    """Update album metadata in a collection"""
    try:
        return service.update_album_metadata(
            user_id=current_user.id,
            collection_id=collection_id,
            album_id=album_id,
            metadata=data
        )
    except (ResourceNotFoundError, ForbiddenError, ValidationError) as e:
        raise e
    except Exception as e:
        logger.error(f"update_album_metadata endpoint - {str(e)}")
        raise ServerError(
            error_code=5000,
            message="Failed to update album metadata",
            details={"error": str(e)}
        )


@router.get("/{collection_id}/search", status_code=status.HTTP_200_OK)
def search_collection_items(
    collection_id: int = Path(..., gt=0, title="Collection ID"),
    q: str = Query(..., min_length=1, description="Search term"),
    search_type: str = Query("both", description="Search type: 'album', 'artist', or 'both'"),
    user=Depends(get_current_user),
    service: CollectionService = Depends(get_collection_service),
):
    """Search albums and/or artists in a collection."""
    try:
        if search_type not in ["album", "artist", "both"]:
            raise HTTPException(status_code=400, detail="Invalid search_type. Must be 'album', 'artist', or 'both'")
        
        result = service.search_collection_items(collection_id, user.id, q, search_type)
        return result
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail["message"])
    except Exception as e:
        logger.error(f"Unexpected error searching collection items: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")
