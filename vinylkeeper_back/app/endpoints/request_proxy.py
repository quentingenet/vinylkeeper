from fastapi import APIRouter, Depends
from typing import List
from app.deps.deps import get_search_service
from app.schemas.request_proxy.request_proxy_schema import DiscogsData, SearchQuery
from app.core.logging import logger

router = APIRouter()


@router.post("/search", response_model=List[DiscogsData], status_code=200)
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
