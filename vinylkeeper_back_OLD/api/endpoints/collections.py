from fastapi import APIRouter, HTTPException, status, Depends, Path, Query
from sqlalchemy.orm import Session
from typing import Annotated, List
from api.schemas.collection_schemas import CollectionBase, CollectionResponse, SwitchAreaRequest
from api.schemas.external_reference_schemas import ExternalReference
from api.core.logging import logger
from api.utils.auth_utils.auth import get_current_user
from api.schemas.user_schemas import User
from api.core.dependencies_solid import get_collection_service_solid, get_validation_service

router = APIRouter()

@router.post("/add", status_code=status.HTTP_201_CREATED)
async def create_collection(
    new_collection: CollectionBase,
    user: Annotated[User, Depends(get_current_user)],
    service = Depends(get_collection_service_solid)
):
    collection_created = service.create_collection(new_collection, user.id)
    if not collection_created:
        logger.warning(f"Failed to create collection: {new_collection.name} for user {user.username}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create collection")
    
    logger.info(f"Collection created successfully: {new_collection.name} for user {user.username}")
    return {"message": "Collection created successfully"}

@router.get("/", status_code=status.HTTP_200_OK)
async def get_collections(
    user: Annotated[User, Depends(get_current_user)],
    service = Depends(get_collection_service_solid),
    page: int = Query(1, gt=0),
    limit: int = Query(3, gt=0, le=100)
):
    collections, total = service.get_user_collections(user.id, page, limit)
    if not collections and page > 1:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
    
    return {
        "items": [CollectionResponse.model_validate(collection).model_dump() for collection in collections],
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }

@router.get("/public", status_code=status.HTTP_200_OK)
async def get_public_collections(
    user: Annotated[User, Depends(get_current_user)],
    service = Depends(get_collection_service_solid),
    page: int = Query(1, gt=0),
    limit: int = Query(10, gt=0, le=100)
):
    collections, total = service.get_public_collections(page, limit, exclude_user_id=user.id)
    
    return {
        "items": [CollectionResponse.model_validate(collection).model_dump() for collection in collections],
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }

@router.get("/{collection_id}", status_code=status.HTTP_200_OK)
async def get_collection_by_id(
    user: Annotated[User, Depends(get_current_user)],
    service = Depends(get_collection_service_solid),
    collection_id: int = Path(..., gt=0, title="Collection ID", description="The ID of the collection to retrieve")
):
    collection = service.get_collection_by_id(collection_id, user.id)
    if not collection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found")
    
    return CollectionResponse.model_validate(collection).model_dump()

@router.patch("/area/{collection_id}", status_code=status.HTTP_200_OK)
async def switch_area_collection(
    user: Annotated[User, Depends(get_current_user)],
    request_body: SwitchAreaRequest,
    service = Depends(get_collection_service_solid),
    collection_id: int = Path(..., gt=0, title="Collection ID", description="The ID of the collection to update")
):
    collection_updated = service.update_collection_area(collection_id, request_body.is_public, user.id)
    if not collection_updated:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to update collection area")
    
    return {"message": "Collection updated successfully"}

@router.delete("/{collection_id}", status_code=status.HTTP_200_OK)
async def delete_collection(
    user: Annotated[User, Depends(get_current_user)],
    service = Depends(get_collection_service_solid),
    collection_id: int = Path(..., gt=0, title="Collection ID", description="The ID of the collection to delete"),
):
    """Delete a collection (REST-compliant endpoint)"""
    collection_deleted = service.delete_collection(collection_id, user.id)
    if not collection_deleted:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to delete collection")
    
    logger.info(f"Collection {collection_id} deleted successfully for user {user.username}")
    return {"message": "Collection deleted successfully"}

@router.patch("/update/{collection_id}", status_code=status.HTTP_200_OK)
async def update_collection(
    user: Annotated[User, Depends(get_current_user)],
    request_body: CollectionBase,
    service = Depends(get_collection_service_solid),
    collection_id: int = Path(..., gt=0, title="Collection ID", description="The ID of the collection to update")
):
    collection_updated = service.update_collection(collection_id, request_body, user.id)
    if not collection_updated:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to update collection")
    
    return {"message": "Collection updated successfully"}

@router.get("/{collection_id}/details", status_code=status.HTTP_200_OK)
async def get_collection_details(
    user: Annotated[User, Depends(get_current_user)],
    service = Depends(get_collection_service_solid),
    collection_id: int = Path(..., gt=0, title="Collection ID", description="The ID of the collection to retrieve details for")
):
    """Get complete collection details including local and external items"""
    # Use SOLID service that handles complex business logic
    details = service.get_collection_details(collection_id, user.id)
    
    if not details:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found")
    
    # Format the response with proper collection data
    return {
        "collection": CollectionResponse.model_validate(details["collection"]).model_dump(),
        "local_albums": details["local_albums"],
        "local_artists": details["local_artists"],
        "local_genres": details["local_genres"],
        "external_albums": details["external_albums"],
        "external_artists": details["external_artists"]
    }

@router.delete("/{collection_id}/albums/{album_id}", status_code=status.HTTP_200_OK)
async def remove_album_from_collection(
    user: Annotated[User, Depends(get_current_user)],
    service = Depends(get_collection_service_solid),
    collection_id: int = Path(..., gt=0, title="Collection ID", description="The ID of the collection"),
    album_id: int = Path(..., gt=0, title="Album ID", description="The ID of the album to remove")
):
    """Remove an album from a collection"""
    success = service.remove_album_from_collection(collection_id, album_id, user.id)
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to remove album from collection")
    
    return {"success": True, "message": "Album removed from collection successfully"}

@router.delete("/{collection_id}/artists/{artist_id}", status_code=status.HTTP_200_OK)
async def remove_artist_from_collection(
    user: Annotated[User, Depends(get_current_user)],
    service = Depends(get_collection_service_solid),
    collection_id: int = Path(..., gt=0, title="Collection ID", description="The ID of the collection"),
    artist_id: int = Path(..., gt=0, title="Artist ID", description="The ID of the artist to remove")
):
    """Remove an artist from a collection"""
    success = service.remove_artist_from_collection(collection_id, artist_id, user.id)
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to remove artist from collection")
    
    return {"success": True, "message": "Artist removed from collection successfully"}

@router.delete("/{collection_id}/genres/{genre_id}", status_code=status.HTTP_200_OK)
async def remove_genre_from_collection(
    user: Annotated[User, Depends(get_current_user)],
    service = Depends(get_collection_service_solid),
    collection_id: int = Path(..., gt=0, title="Collection ID", description="The ID of the collection"),
    genre_id: int = Path(..., gt=0, title="Genre ID", description="The ID of the genre to remove")
):
    """Remove a genre from a collection"""
    success = service.remove_genre_from_collection(collection_id, genre_id, user.id)
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to remove genre from collection")
    
    return {"success": True, "message": "Genre removed from collection successfully"}
