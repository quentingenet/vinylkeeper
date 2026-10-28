from fastapi import APIRouter, Depends
from typing import List
from app.deps.deps import get_search_service
from app.models.user_model import User
from app.schemas.request_proxy.request_proxy_schema import (
    AlbumMetadata,
    DiscogsData,
    SearchQuery,
    SearchResultsPage,
    ArtistMetadata
)
from app.services.search_service import SearchService
from app.utils.auth_utils.auth import get_current_user
from app.utils.endpoint_utils import handle_app_exceptions

router = APIRouter()


@router.post("/search-music", response_model=List[DiscogsData], status_code=200)
@handle_app_exceptions
async def search(
    search_query: SearchQuery,
    service: SearchService = Depends(get_search_service),
    current_user: User = Depends(get_current_user)
) -> List[DiscogsData]:
    """
    Search music via the Discogs API. Requires authentication.

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


@router.post("/search-music/page", response_model=SearchResultsPage, status_code=200)
@handle_app_exceptions
async def search_page(
    search_query: SearchQuery,
    service: SearchService = Depends(get_search_service),
    current_user: User = Depends(get_current_user)
) -> SearchResultsPage:
    """One page of Discogs search results, with the number of pages. Requires authentication."""
    return await service.search_music_page(search_query)


@router.get("/music-metadata/artist/{artist_id}", response_model=ArtistMetadata, status_code=200)
@handle_app_exceptions
async def get_artist_metadata(
    artist_id: str,
    service: SearchService = Depends(get_search_service),
    current_user: User = Depends(get_current_user)
) -> ArtistMetadata:
    """
    Get detailed artist metadata from Discogs API. Requires authentication.

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
    service: SearchService = Depends(get_search_service),
    current_user: User = Depends(get_current_user)
) -> AlbumMetadata:
    """
    Get detailed album metadata from Discogs API. Requires authentication.

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
