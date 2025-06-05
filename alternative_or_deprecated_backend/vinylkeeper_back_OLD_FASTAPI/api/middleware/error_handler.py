from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from api.schemas.common_schemas import StandardError
from api.core.logging import logger
import traceback


async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Gestionnaire global d'exceptions pour standardiser les réponses d'erreur"""
    
    if isinstance(exc, HTTPException):
        error_response = StandardError(
            message=exc.detail,
            error_code=f"HTTP_{exc.status_code}"
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=error_response.model_dump()
        )
    
    elif isinstance(exc, SQLAlchemyError):
        logger.error(f"Database error: {str(exc)}")
        error_response = StandardError(
            message="Database error occurred",
            error_code="DATABASE_ERROR"
        )
        return JSONResponse(
            status_code=500,
            content=error_response.model_dump()
        )
    
    else:
        logger.error(f"Unexpected error: {str(exc)}\n{traceback.format_exc()}")
        error_response = StandardError(
            message="Internal server error",
            error_code="INTERNAL_ERROR"
        )
        return JSONResponse(
            status_code=500,
            content=error_response.model_dump()
        )


def create_success_response(message: str, data: any = None) -> dict:
    """Utilitaire pour créer des réponses de succès standardisées"""
    return {
        "success": True,
        "message": message,
        "data": data
    }


def create_error_response(message: str, errors: list = None, error_code: str = None) -> dict:
    """Utilitaire pour créer des réponses d'erreur standardisées"""
    return {
        "success": False,
        "message": message,
        "errors": errors,
        "error_code": error_code
    } 