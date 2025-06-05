from typing import List
from fastapi import HTTPException
from api.repositories.interfaces import ISearchRepository
from api.schemas.request_proxy.request_proxy_deezer import SearchQuery, DeezerData
from api.core.logging import logger


class SearchService:
    """SOLID Search Service - Business Logic Layer"""
    
    def __init__(self, search_repo: ISearchRepository):
        self.search_repo = search_repo
    
    def search_music(self, search_query: SearchQuery) -> List[DeezerData]:
        """Search for music with business validation"""
        
        # Business rule: Query cannot be empty
        if not search_query.query or not search_query.query.strip():
            raise HTTPException(
                status_code=400, 
                detail="Search query cannot be empty"
            )
        
        # Business rule: Query length validation
        query_stripped = search_query.query.strip()
        if len(query_stripped) < 2:
            raise HTTPException(
                status_code=400,
                detail="Search query must be at least 2 characters long"
            )
        
        # Business rule: Query length limit
        if len(query_stripped) > 100:
            raise HTTPException(
                status_code=400,
                detail="Search query cannot exceed 100 characters"
            )
        
        try:
            # Use repository to perform search
            results = self.search_repo.search_deezer_api(search_query)
            
            # Business rule: Log search statistics
            search_type = "artist" if search_query.is_artist else "album"
            logger.info(f"Search completed: '{query_stripped}' ({search_type}) returned {len(results)} results")
            
            return results
            
        except HTTPException:
            # Re-raise HTTP exceptions (validation errors)
            raise
        except Exception as e:
            # Log and convert other exceptions to HTTP errors
            logger.error(f"Search service error: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Search service error: {str(e)}"
            ) 