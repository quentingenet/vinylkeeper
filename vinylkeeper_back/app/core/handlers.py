# app/core/handlers.py
import logging
import traceback
import os
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.core.exceptions import AppException
from app.core.config_env import settings

logger = logging.getLogger("app")


def _extract_file_info(tb):
    """Extract file info from traceback, showing only the path from /app"""
    if tb:
        last_frame = tb[-1]
        full_path = last_frame.filename
        
        if '/app' in full_path:
            app_index = full_path.find('/app')
            file_info = full_path[app_index + 1:]
        else:
            file_info = os.path.basename(full_path)
        
        return f"{file_info}:{last_frame.lineno}"
    else:
        return "unknown:0"


def register_exception_handlers(app):
    @app.exception_handler(AppException)
    def app_exception_handler(request: Request, exc: AppException):
        # Don't log 404 and 405 errors in production, regardless of should_log
        should_log = exc.should_log
        if settings.APP_ENV == "production" and exc.status_code in [404, 405]:
            should_log = False
            
        if should_log:
            tb = traceback.extract_tb(exc.__traceback__)
            file_info = _extract_file_info(tb)
            
            error_details = f"AppException (code {exc.detail['code']}): {exc.detail['message']} - File: {file_info}"
            if exc.detail.get('details'):
                error_details += f" - Details: {exc.detail['details']}"
            logger.error(error_details)
        return JSONResponse(status_code=exc.status_code, content=exc.detail)

    @app.exception_handler(RequestValidationError)
    def validation_exception_handler(request: Request, exc: RequestValidationError):
        tb = traceback.extract_tb(exc.__traceback__)
        file_info = _extract_file_info(tb)
        
        errors = []
        for error in exc.errors():
            error_dict = {
                "type": str(error.get("type", "")),
                "loc": error.get("loc", []),
                "msg": str(error.get("msg", "")),
                "input": str(error.get("input", ""))
            }
            if "ctx" in error:
                error_dict["ctx"] = {k: str(v) for k, v in error["ctx"].items()}
            errors.append(error_dict)
        
        logger.error(f"Validation error: {errors} - File: {file_info}")
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "code": 3000,
                "message": "Validation error",
                "details": {"errors": errors}
            }
        )

    @app.exception_handler(StarletteHTTPException)
    def http_exception_handler(request: Request, exc: StarletteHTTPException):
        # Don't log 404 and 405 errors in production
        should_log = True
        if settings.APP_ENV == "production" and exc.status_code in [404, 405]:
            should_log = False
        
        # Don't log refresh token not found errors
        if "Refresh token not found" in str(exc.detail):
            should_log = False
            
        # Don't log 401 "No access token provided" errors
        if exc.status_code == 401 and "No access token provided" in str(exc.detail):
            should_log = False
            
        if should_log:
            tb = traceback.extract_tb(exc.__traceback__)
            file_info = _extract_file_info(tb)
            logger.error(f"HTTP {exc.status_code} - {exc.detail} | {file_info}")
        
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
