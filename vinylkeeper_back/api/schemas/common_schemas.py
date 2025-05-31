from typing import Optional, Any, List, Union
from pydantic import BaseModel


class StandardResponse(BaseModel):
    """Modèle de réponse standardisé pour toutes les APIs"""
    success: bool
    message: str
    data: Optional[Any] = None
    errors: Optional[List[str]] = None


class PaginatedResponse(BaseModel):
    """Modèle de réponse paginée standardisé"""
    items: List[Any]
    total: int
    page: int
    limit: int
    total_pages: int


class StandardError(BaseModel):
    """Modèle d'erreur standardisé"""
    success: bool = False
    message: str
    errors: Optional[List[str]] = None
    error_code: Optional[str] = None 