from functools import wraps
from typing import Callable, Any
from app.core.logging import logger
from app.core.exceptions import AppException


def handle_app_exceptions(func: Callable) -> Callable:
    """
    Decorator to handle AppException and other exceptions in endpoints.
    AppException are re-raised directly for global handlers.
    Other exceptions are logged and converted to ServerError.
    """
    @wraps(func)
    async def wrapper(*args, **kwargs) -> Any:
        try:
            return await func(*args, **kwargs)
        except AppException:
            # Re-raise AppException directly for global handlers
            raise
        except Exception as e:
            # Log unexpected errors and convert to ServerError
            logger.error(f"Unexpected error in {func.__name__}: {str(e)}")
            raise AppException(
                error_code=5000,
                message="Internal server error",
                status_code=500,
                should_log=False  # Already logged above
            )
    return wrapper


def handle_app_exceptions_sync(func: Callable) -> Callable:
    """
    Synchronous version of handle_app_exceptions decorator.
    """
    @wraps(func)
    def wrapper(*args, **kwargs) -> Any:
        try:
            return func(*args, **kwargs)
        except AppException:
            # Re-raise AppException directly for global handlers
            raise
        except Exception as e:
            # Log unexpected errors and convert to ServerError
            logger.error(f"Unexpected error in {func.__name__}: {str(e)}")
            raise AppException(
                error_code=5000,
                message="Internal server error",
                status_code=500,
                should_log=False  # Already logged above
            )
    return wrapper 