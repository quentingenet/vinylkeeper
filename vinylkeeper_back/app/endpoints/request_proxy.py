from fastapi import APIRouter, Depends
from typing import List
from app.deps.deps import get_search_service
from app.schemas.request_proxy.request_proxy_schema import (
    AlbumMetadata,
    DiscogsData,
    SearchQuery,
    ArtistMetadata
)
from app.core.exceptions import (
    ServerError,
    ValidationError,
    ErrorCode
)
from app.services.search_service import SearchService
from app.utils.endpoint_utils import handle_app_exceptions

router = APIRouter()


@router.post("/search-music", response_model=List[DiscogsData], status_code=200)
@handle_app_exceptions
async def search(
    search_query: SearchQuery,
    service: SearchService = Depends(get_search_service)
) -> List[DiscogsData]:
    """
    Search music via the Discogs API.

    Args:
        search_query: Search parameters containing query string and search type
        service: Injected search service instance

    Returns:
        List[DiscogsData]: List of search results matching the query

    Raises:
        ValidationError: If search parameters are invalid (query length < 2 or > 100)
        ServerError: If an error occurs during search or API communication
    """
    results = await service.search_music(search_query)
    return results


@router.get("/music-metadata/artist/{artist_id}", response_model=ArtistMetadata, status_code=200)
@handle_app_exceptions
async def get_artist_metadata(
    artist_id: str,
    service: SearchService = Depends(get_search_service)
) -> ArtistMetadata:
    """
    Get detailed artist metadata from Discogs API.

    Args:
        artist_id: Unique identifier for the artist in Discogs
        service: Injected search service instance

    Returns:
        ArtistMetadata: Detailed artist information including biography, genres, etc.

    Raises:
        ServerError: If artist not found or API communication fails
    """
    results = await service.get_artist_metadata(artist_id)
    return results


@router.get("/music-metadata/album/{album_id}", response_model=AlbumMetadata, status_code=200)
@handle_app_exceptions
async def get_album_metadata(
    album_id: str,
    service: SearchService = Depends(get_search_service)
) -> AlbumMetadata:
    """
    Get detailed album metadata from Discogs API.

    Args:
        album_id: Unique identifier for the album in Discogs
        service: Injected search service instance

    Returns:
        AlbumMetadata: Detailed album information including tracklist, genres, etc.

    Raises:
        ServerError: If album not found or API communication fails
    """
    results = await service.get_album_metadata(album_id)
    return results
