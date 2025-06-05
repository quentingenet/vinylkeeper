from fastapi import APIRouter, Depends, Query
from typing import Optional
from api.services.music_metadata_service_solid import MusicMetadataService
from api.core.dependencies_solid import get_music_metadata_service_solid

router = APIRouter()

@router.get("/album/{external_id}")
async def get_album_metadata(
    external_id: str,
    artist_name: Optional[str] = Query(None),
    album_title: Optional[str] = Query(None),
    service: MusicMetadataService = Depends(get_music_metadata_service_solid)
):
    return service.get_album_metadata(external_id, artist_name, album_title)

@router.get("/artist/{external_id}")
async def get_artist_metadata(
    external_id: str,
    artist_name: Optional[str] = Query(None),
    service: MusicMetadataService = Depends(get_music_metadata_service_solid)
):
    return service.get_artist_metadata(external_id, artist_name) 