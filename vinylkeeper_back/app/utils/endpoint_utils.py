from functools import wraps
from typing import Callable, Any
from app.core.logging import logger
from app.core.exceptions import AppException
import traceback
import os


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


def handle_app_exceptions(func: Callable) -> Callable:
    """
    Enhanced decorator to handle AppException and other exceptions in endpoints.
    AppException are re-raised directly for global handlers.
    Other exceptions are logged with detailed context and converted to ServerError.
    """
    @wraps(func)
    async def wrapper(*args, **kwargs) -> Any:
        try:
            return await func(*args, **kwargs)
        except AppException:
            # Re-raise AppException directly for global handlers
            raise
        except Exception as e:
            # Extract detailed context for better error logging
            tb = traceback.extract_tb(e.__traceback__)
            file_info = _extract_file_info(tb)
            
            # Try to extract user context from kwargs if available
            user_context = ""
            if 'user' in kwargs and hasattr(kwargs['user'], 'id'):
                user_context = f" for user {kwargs['user'].id}"
            elif 'user' in kwargs and hasattr(kwargs['user'], 'user_uuid'):
                user_context = f" for user {kwargs['user'].user_uuid}"
            
            # Try to extract entity context from path parameters
            entity_context = ""
            if 'collection_id' in kwargs:
                entity_context = f" collection {kwargs['collection_id']}"
            elif 'place_id' in kwargs:
                entity_context = f" place {kwargs['place_id']}"
            elif 'album_id' in kwargs:
                entity_context = f" album {kwargs['album_id']}"
            elif 'artist_id' in kwargs:
                entity_context = f" artist {kwargs['artist_id']}"
            
            # Log with detailed context
            error_context = f"{func.__name__}{user_context}{entity_context}"
            logger.error(f"Unexpected error in {error_context} - File: {file_info} - Error: {str(e)}")
            
            # Re-raise as ServerError with more context
            from app.core.exceptions import ServerError
            raise ServerError(
                error_code=5000,
                message=f"Operation failed: {func.__name__}",
                details={
                    "error": str(e),
                    "function": func.__name__,
                    "file": file_info,
                    "context": {
                        "user": user_context.strip(" for user ") if user_context else None,
                        "entity": entity_context.strip() if entity_context else None
                    }
                }
            )
    return wrapper


def handle_app_exceptions_sync(func: Callable) -> Callable:
    """
    Enhanced synchronous version of handle_app_exceptions decorator.
    """
    @wraps(func)
    def wrapper(*args, **kwargs) -> Any:
        try:
            return func(*args, **kwargs)
        except AppException:
            # Re-raise AppException directly for global handlers
            raise
        except Exception as e:
            # Extract detailed context for better error logging
            tb = traceback.extract_tb(e.__traceback__)
            file_info = _extract_file_info(tb)
            
            # Try to extract user context from kwargs if available
            user_context = ""
            if 'user' in kwargs and hasattr(kwargs['user'], 'id'):
                user_context = f" for user {kwargs['user'].id}"
            elif 'user' in kwargs and hasattr(kwargs['user'], 'user_uuid'):
                user_context = f" for user {kwargs['user'].user_uuid}"
            
            # Try to extract entity context from path parameters
            entity_context = ""
            if 'collection_id' in kwargs:
                entity_context = f" collection {kwargs['collection_id']}"
            elif 'place_id' in kwargs:
                entity_context = f" place {kwargs['place_id']}"
            elif 'album_id' in kwargs:
                entity_context = f" album {kwargs['album_id']}"
            elif 'artist_id' in kwargs:
                entity_context = f" artist {kwargs['artist_id']}"
            
            # Log with detailed context
            error_context = f"{func.__name__}{user_context}{entity_context}"
            logger.error(f"Unexpected error in {error_context} - File: {file_info} - Error: {str(e)}")
            
            # Re-raise as ServerError with more context
            from app.core.exceptions import ServerError
            raise ServerError(
                error_code=5000,
                message=f"Operation failed: {func.__name__}",
                details={
                    "error": str(e),
                    "function": func.__name__,
                    "file": file_info,
                    "context": {
                        "user": user_context.strip(" for user ") if user_context else None,
                        "entity": entity_context.strip() if entity_context else None
                    }
                }
            )
    return wrapper 