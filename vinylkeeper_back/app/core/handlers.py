# app/core/handlers.py
import logging
import traceback
import os
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.core.exceptions import AppException

logger = logging.getLogger("app")


def _extract_file_info(tb):
    """Extract file info from traceback, showing only the path from /app"""
    if tb:
        # Prendre la dernière frame (où l'exception a été levée)
        last_frame = tb[-1]
        full_path = last_frame.filename
        
        # Chercher '/app' dans le chemin et extraire la partie qui suit
        if '/app' in full_path:
            app_index = full_path.find('/app')
            file_info = full_path[app_index + 1:]  # +1 pour enlever le '/'
        else:
            # Fallback si '/app' n'est pas trouvé
            file_info = os.path.basename(full_path)
        
        return f"{file_info}:{last_frame.lineno}"
    else:
        return "unknown:0"


def register_exception_handlers(app):
    @app.exception_handler(AppException)
    def app_exception_handler(request: Request, exc: AppException):
        if exc.should_log:
            # Récupérer les informations de la stack trace
            tb = traceback.extract_tb(exc.__traceback__)
            file_info = _extract_file_info(tb)
            
            # Amélioration du logging pour capturer plus de détails
            error_details = f"AppException (code {exc.detail['code']}): {exc.detail['message']} - File: {file_info}"
            if exc.detail.get('details'):
                error_details += f" - Details: {exc.detail['details']}"
            logger.error(error_details)
        return JSONResponse(status_code=exc.status_code, content=exc.detail)

    @app.exception_handler(RequestValidationError)
    def validation_exception_handler(request: Request, exc: RequestValidationError):
        # Récupérer les informations de la stack trace
        tb = traceback.extract_tb(exc.__traceback__)
        file_info = _extract_file_info(tb)
        
        logger.error(f"Validation error: {exc.errors()} - File: {file_info}")
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "code": 3000,
                "message": "Validation error",
                "details": {"errors": exc.errors()}
            }
        )

    @app.exception_handler(StarletteHTTPException)
    def http_exception_handler(request: Request, exc: StarletteHTTPException):
        # Don't log refresh token errors as they are frequent and normal
        if "Refresh token not found" not in str(exc.detail):
            # Récupérer les informations de la stack trace
            tb = traceback.extract_tb(exc.__traceback__)
            file_info = _extract_file_info(tb)
            
            client_ip = request.client.host if request.client else "unknown"
            user_agent = request.headers.get("user-agent", "unknown")
            method = request.method
            url = str(request.url)
            
            # Formater le message avec plus de détails
            error_details = (
                f"HTTP {exc.status_code} - {exc.detail} | "
                f"Method: {method} | "
                f"URL: {url} | "
                f"IP: {client_ip} | "
                f"User-Agent: {user_agent[:100]} | "  # Limiter la longueur
                f"File: {file_info}"
            )
            
            logger.error(error_details)
        
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "code": 9998,
                "message": exc.detail,
                "details": {}
            }
        )

    @app.exception_handler(Exception)
    def unhandled_exception_handler(request: Request, exc: Exception):
        # Récupérer les informations de la stack trace
        tb = traceback.extract_tb(exc.__traceback__)
        file_info = _extract_file_info(tb)
        
        logger.exception(f"Unhandled exception occurred - File: {file_info}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "code": 9999,
                "message": "Internal Server Error",
                "details": {}
            }
        )
