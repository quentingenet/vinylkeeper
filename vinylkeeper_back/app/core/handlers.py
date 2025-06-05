# app/core/handlers.py
import logging
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.core.exceptions import AppException

logger = logging.getLogger("app")


def register_exception_handlers(app):
    @app.exception_handler(AppException)
    def app_exception_handler(request: Request, exc: AppException):
        if exc.should_log:
            logger.error(
                f"AppException (code {exc.detail['code']}): {exc.detail['message']}")
        return JSONResponse(status_code=exc.status_code, content=exc.detail)

    @app.exception_handler(RequestValidationError)
    def validation_exception_handler(request: Request, exc: RequestValidationError):
        logger.error(f"Validation error: {exc.errors()}")
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
        logger.error(f"HTTP error: {exc.detail}")
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
        logger.exception("Unhandled exception occurred")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "code": 9999,
                "message": "Internal Server Error",
                "details": {}
            }
        )
