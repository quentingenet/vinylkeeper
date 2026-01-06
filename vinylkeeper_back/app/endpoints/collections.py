from fastapi import APIRouter, Depends, status, Path, Query, Body
from app.schemas.collection_schema import (
    CollectionCreate,
    CollectionDetailResponse,
    CollectionUpdate,
    CollectionResponse,
    CollectionListItemResponse,
    CollectionVisibilityUpdate,
    PaginatedAlbumsResponse,
    PaginatedArtistsResponse,
    PaginatedCollectionListResponse,
    CollectionSearchResponse,
    CollectionAlbumResponse
)
from app.schemas.like_schema import LikeStatusResponse
from app.services.collection_service import CollectionService
from app.deps.deps import get_collection_service
from app.utils.auth_utils.auth import get_current_user
from app.models.user_model import User
from app.core.exceptions import (
    ResourceNotFoundError,
    ForbiddenError,
    DuplicateFieldError,
    AppException,
    ValidationError,
    ServerError,
)
from app.schemas.collection_album_schema import CollectionAlbumUpdate
from app.utils.endpoint_utils import handle_app_exceptions
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/add", status_code=status.HTTP_201_CREATED)
@handle_app_exceptions
async def create_collection(
    data: CollectionCreate,
    user=Depends(get_current_user),
    service: CollectionService = Depends(get_collection_service)
):
    try:
        collection = await service.create_collection(data, user.id)
        # Commit the transaction for standalone collection creation
        await service.repository.db.commit()
        logger.info(f"Collection created: {collection.id} by user {user.id}")
        return {
            "message": "Collection created successfully",
            "collection_id": collection.id
        }
    except Exception as e:
        logger.error(
            f"Failed to create collection for user {user.id}: {str(e)}")
        logger.error(f"Collection data: {data.model_dump()}")
        raise


@router.get("/", status_code=status.HTTP_200_OK, response_model=PaginatedCollectionListResponse)
@handle_app_exceptions
async def get_user_collections(
    user=Depends(get_current_user),
    service: CollectionService = Depends(get_collection_service),
    page: int = Query(1, gt=0),
    limit: int = Query(10, gt=0, le=100)
):
    """Get user's collections with pagination (optimized list view, lightweight response)."""
    collections, total = await service.get_user_collections(user.id, page, limit)
    return PaginatedCollectionListResponse(
        items=collections,
        total=total,
        page=page,
        limit=limit,
        total_pages=(total + limit - 1) // limit
    )


@router.get("/public", status_code=status.HTTP_200_OK, response_model=PaginatedCollectionListResponse)
@handle_app_exceptions
async def get_public_collections(
    user=Depends(get_current_user),
    service: CollectionService = Depends(get_collection_service),
    page: int = Query(1, gt=0),
    limit: int = Query(10, gt=0, le=100),
    sort_by: str = Query(
        "updated_at", description="Sort by: updated_at, created_at, or likes_count")
):
    """Get public collections (optimized list view with lightweight response)."""
    collections, total = await service.get_public_collections(page, limit, exclude_user_id=user.id, user_id=user.id, sort_by=sort_by)
    return PaginatedCollectionListResponse(
        items=collections,
        total=total,
        page=page,
        limit=limit,
        total_pages=(total + limit - 1) // limit
    )


@router.get("/{collection_id}", status_code=status.HTTP_200_OK)
@handle_app_exceptions
async def get_collection_by_id(
    collection_id: int = Path(..., gt=0, title="Collection ID"),
    user=Depends(get_current_user),
    service: CollectionService = Depends(get_collection_service),
):
    collection = await service.get_collection_by_id(collection_id, user.id)
    return CollectionResponse.model_validate(collection).model_dump()


@router.patch("/area/{collection_id}", status_code=status.HTTP_200_OK)
@handle_app_exceptions
async def switch_area_collection(
    collection_id: int = Path(..., gt=0),
    data: CollectionVisibilityUpdate = Body(...),
    user=Depends(get_current_user),
    service: CollectionService = Depends(get_collection_service),
):
    updated = await service.update_collection(
        user.id,
        collection_id,
        CollectionUpdate(is_public=data.is_public)
    )
    if not updated:
        raise ValidationError(
            error_code=4000,
            message="Failed to update collection visibility"
        )
    return {"message": "Collection visibility updated successfully"}


@router.patch("/update/{collection_id}", status_code=status.HTTP_200_OK)
@handle_app_exceptions
async def update_collection(
    collection_id: int = Path(..., gt=0, title="Collection ID"),
    data: CollectionUpdate = Body(...),
    user=Depends(get_current_user),
    service: CollectionService = Depends(get_collection_service),
):
    updated = await service.update_collection(user.id, collection_id, data)
    if not updated:
        raise ValidationError(
            error_code=4000,
            message="Failed to update collection"
        )
    return {"message": "Collection updated successfully"}


@router.delete("/{collection_id}", status_code=status.HTTP_200_OK)
@handle_app_exceptions
async def delete_collection(
    collection_id: int = Path(..., gt=0, title="Collection ID"),
    user=Depends(get_current_user),
    service: CollectionService = Depends(get_collection_service),
):
    deleted = await service.delete_collection(user.id, collection_id)
    return {"message": "Collection deleted successfully"}


@router.get("/{collection_id}/details", status_code=status.HTTP_200_OK, response_model=CollectionDetailResponse)
@handle_app_exceptions
async def get_collection_details(
    collection_id: int = Path(..., gt=0, title="Collection ID"),
    user=Depends(get_current_user),
    service: CollectionService = Depends(get_collection_service),
):
    """Get lightweight collection details (optimized - no albums/artists loaded)."""
    details = await service.get_collection_details_lightweight(collection_id, user.id)
    return details


@router.get("/{collection_id}/albums", status_code=status.HTTP_200_OK)
@handle_app_exceptions
async def get_collection_albums_paginated(
    collection_id: int = Path(..., gt=0, title="Collection ID"),
    page: int = Query(1, gt=0, description="Page number"),
    limit: int = Query(
        12, gt=0, le=50, description="Number of items per page"),
    sort_order: str = Query("newest", description="Sort order: 'newest' or 'oldest'"),
    user=Depends(get_current_user),
    service: CollectionService = Depends(get_collection_service),
):
    response = await service.get_collection_albums_paginated(collection_id, user.id, page, limit, sort_order)
    return response.model_dump()


@router.get("/{collection_id}/artists", status_code=status.HTTP_200_OK)
@handle_app_exceptions
async def get_collection_artists_paginated(
    collection_id: int = Path(..., gt=0, title="Collection ID"),
    page: int = Query(1, gt=0, description="Page number"),
    limit: int = Query(
        12, gt=0, le=50, description="Number of items per page"),
    sort_order: str = Query("newest", description="Sort order: 'newest' or 'oldest'"),
    user=Depends(get_current_user),
    service: CollectionService = Depends(get_collection_service),
):
    response = await service.get_collection_artists_paginated(collection_id, user.id, page, limit, sort_order)
    return response.model_dump()


@router.delete("/{collection_id}/albums/{album_id}", status_code=status.HTTP_200_OK)
@handle_app_exceptions
async def remove_album_from_collection(
    collection_id: int = Path(..., gt=0, title="Collection ID"),
    album_id: int = Path(..., gt=0, title="Album ID"),
    user=Depends(get_current_user),
    service: CollectionService = Depends(get_collection_service),
):
    try:
        await service.remove_album_from_collection(user.id, collection_id, album_id)
        logger.info(
            f"Album {album_id} removed from collection {collection_id} by user {user.id}")
        return {"message": "Album removed from collection successfully"}
    except Exception as e:
        logger.error(
            f"Failed to remove album {album_id} from collection {collection_id} for user {user.id}: {str(e)}")
        raise


@router.delete("/{collection_id}/artists/{artist_id}", status_code=status.HTTP_200_OK)
@handle_app_exceptions
async def remove_artist_from_collection(
    collection_id: int = Path(..., gt=0, title="Collection ID"),
    artist_id: int = Path(..., gt=0, title="Artist ID"),
    user=Depends(get_current_user),
    service: CollectionService = Depends(get_collection_service),
):
    try:
        await service.remove_artist_from_collection(user.id, collection_id, artist_id)
        logger.info(
            f"Artist {artist_id} removed from collection {collection_id} by user {user.id}")
        return {"message": "Artist removed from collection successfully"}
    except Exception as e:
        logger.error(
            f"Failed to remove artist {artist_id} from collection {collection_id} for user {user.id}: {str(e)}")
        raise


@router.post("/{collection_id}/like", response_model=LikeStatusResponse, status_code=status.HTTP_200_OK)
@handle_app_exceptions
async def like_collection(
    collection_id: int = Path(..., gt=0, title="Collection ID"),
    user=Depends(get_current_user),
    service: CollectionService = Depends(get_collection_service),
):
    try:
        result = await service.like_collection(user.id, collection_id)
        logger.info(
            f"Collection {collection_id} liked by user {user.id}, likes: {result['likes_count']}")
        return LikeStatusResponse(
            collection_id=collection_id,
            liked=True,
            likes_count=result["likes_count"],
            message=result["message"]
        )
    except Exception as e:
        logger.error(
            f"Failed to like collection {collection_id} for user {user.id}: {str(e)}")
        raise


@router.delete("/{collection_id}/like", response_model=LikeStatusResponse, status_code=status.HTTP_200_OK)
@handle_app_exceptions
async def unlike_collection(
    collection_id: int = Path(..., gt=0, title="Collection ID"),
    user=Depends(get_current_user),
    service: CollectionService = Depends(get_collection_service),
):
    try:
        result = await service.unlike_collection(user.id, collection_id)
        logger.info(
            f"Collection {collection_id} unliked by user {user.id}, likes: {result['likes_count']}")
        return LikeStatusResponse(
            collection_id=collection_id,
            liked=False,
            likes_count=result["likes_count"],
            message=result["message"]
        )
    except Exception as e:
        logger.error(
            f"Failed to unlike collection {collection_id} for user {user.id}: {str(e)}")
        raise


@router.patch("/{collection_id}/albums/{album_id}/metadata", response_model=CollectionAlbumResponse)
@handle_app_exceptions
async def update_album_metadata(
    collection_id: int,
    album_id: int,
    data: CollectionAlbumUpdate,
    current_user: User = Depends(get_current_user),
    service: CollectionService = Depends(get_collection_service)
) -> CollectionAlbumResponse:
    updated_metadata = await service.update_album_metadata(
        current_user.id, collection_id, album_id, data
    )
    return updated_metadata


@router.get("/{collection_id}/search", status_code=status.HTTP_200_OK)
@handle_app_exceptions
async def search_collection_items(
    collection_id: int = Path(..., gt=0, title="Collection ID"),
    q: str = Query(..., min_length=1, description="Search term"),
    search_type: str = Query(
        "both", description="Search type: 'album', 'artist', 'albums', 'artists', or 'both'"),
    user=Depends(get_current_user),
    service: CollectionService = Depends(get_collection_service),
):
    results = await service.search_collection_items(collection_id, user.id, q, search_type)
    return results
