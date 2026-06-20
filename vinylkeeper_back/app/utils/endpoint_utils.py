from functools import wraps
from typing import Callable, Any
from app.core.logging import logger, extract_file_info
from app.core.exceptions import AppException, ServerError
import traceback


def _handle_unexpected_error(func_name: str, kwargs: dict, e: Exception) -> None:
    """Extract context, log, and raise ServerError for unexpected exceptions."""
    tb = traceback.extract_tb(e.__traceback__)
    file_info = extract_file_info(tb)

    user_context = ""
    if 'user' in kwargs and hasattr(kwargs['user'], 'id'):
        user_context = f" for user {kwargs['user'].id}"
    elif 'user' in kwargs and hasattr(kwargs['user'], 'user_uuid'):
        user_context = f" for user {kwargs['user'].user_uuid}"

    entity_context = ""
    if 'collection_id' in kwargs:
        entity_context = f" collection {kwargs['collection_id']}"
    elif 'place_id' in kwargs:
        entity_context = f" place {kwargs['place_id']}"
    elif 'album_id' in kwargs:
        entity_context = f" album {kwargs['album_id']}"
    elif 'artist_id' in kwargs:
        entity_context = f" artist {kwargs['artist_id']}"

    logger.error(
        f"Unexpected error in {func_name}{user_context}{entity_context} "
        f"- File: {file_info} - Error: {str(e)}"
    )
    raise ServerError(
        error_code=5000,
        message="An unexpected error occurred",
    )


def handle_app_exceptions(func: Callable) -> Callable:
    """
    Decorator for async endpoints: re-raises AppException, converts other
    exceptions to ServerError with contextual logging.
    """
    @wraps(func)
    async def wrapper(*args, **kwargs) -> Any:
        try:
            return await func(*args, **kwargs)
        except AppException:
            raise
        except Exception as e:
            _handle_unexpected_error(func.__name__, kwargs, e)
    return wrapper
