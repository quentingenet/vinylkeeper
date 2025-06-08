from fastapi import APIRouter, Depends
from typing import List
from app.deps.deps import get_search_service
from app.schemas.request_proxy.request_proxy_schema import AlbumMetadata, DiscogsData, SearchQuery, ArtistMetadata
from app.core.logging import logger

router = APIRouter()


@router.post("/search-music", response_model=List[DiscogsData], status_code=200)
async def search(
    search_query: SearchQuery,
    service=Depends(get_search_service)
):
    try:
        results = await service.search_music(search_query)
        return results
    except Exception as e:
        logger.error(f"Search endpoint error: {str(e)}")
        raise


@router.get("/music-metadata/artist", response_model=ArtistMetadata, status_code=200)
async def get_artist_metadata(
    artist_id: str,
    service=Depends(get_search_service)
):
    logger.info(f"Getting artist metadata for: {artist_id}")
    try:
        results = await service.get_artist_metadata(artist_id)
        return results
    except Exception as e:
        logger.error(f"Artist metadata endpoint error: {str(e)}")
        raise


@router.get("/music-metadata/album", response_model=AlbumMetadata, status_code=200)
async def get_album_metadata(
    album_id: str,
    service=Depends(get_search_service)
):
    logger.info(f"Getting album metadata for: {album_id}")
    try:
        results = await service.get_album_metadata(album_id)
        return results
    except Exception as e:
        logger.error(f"Album metadata endpoint error: {str(e)}")
        raise
