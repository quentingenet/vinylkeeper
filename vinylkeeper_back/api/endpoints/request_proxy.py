from fastapi import APIRouter, Depends
from typing import List
from api.schemas.request_proxy.request_proxy_deezer import DeezerData, SearchQuery
from api.core.dependencies_solid import get_search_service_solid

router = APIRouter()

@router.post("/search", response_model=List[DeezerData])
async def search(
    search_query: SearchQuery,
    service = Depends(get_search_service_solid)
):
    """Search for music using Deezer API with SOLID architecture"""
    return service.search_music(search_query)
