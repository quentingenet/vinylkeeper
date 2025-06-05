import httpx
from typing import Optional
from urllib.parse import quote_plus

from app.core.config_env import settings
from app.core.exceptions import ServerError, ErrorCode
from app.core.logging import logger

_client: Optional[httpx.AsyncClient] = None


async def get_http_client() -> httpx.AsyncClient:
    """
    Return a singleton AsyncClient configured with default headers and timeout.
    """
    global _client
    if _client is None:
        _client = httpx.AsyncClient(
            timeout=10.0,
            follow_redirects=True,
            headers={
                "User-Agent": settings.USER_AGENT,
                "Accept": "application/json",
            },
        )
    return _client


async def make_http_request(url: str, params: dict) -> dict:
    """
    Perform GET request with `params` and return parsed JSON.
    Wrap HTTP errors in ServerError.
    """
    client = await get_http_client()
    try:
        response = await client.get(url, params=params)
        response.raise_for_status()
        return response.json()
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            return None
        logger.error(f"HTTP error {e.response.status_code}: {e.response.text}")
        raise
    except Exception as e:
        logger.error(f"Request error: {str(e)}")
        raise
    finally:
        await client.aclose()


async def get_discogs_artist(artist_id: str) -> dict:
    """
    Fetch Discogs artist data by ID.
    Return empty dict on 404.
    """
    client = await get_http_client()
    url = f"{settings.DISCOGS_API_URL}/artists/{artist_id}"
    headers = {
        "Authorization": f"token={settings.DISCOGS_API_KEY}",
        "User-Agent": settings.USER_AGENT,
    }
    try:
        artist_data = await make_http_request(url, headers)
        if not artist_data:
            return {}
        return artist_data
    except Exception as e:
        logger.error(f"Error fetching artist {artist_id}: {str(e)}")
        return {}


async def get_artist_metadata(artist_id: str) -> dict:
    """
    Fetch artist metadata from Discogs.
    Return empty dict on 404.
    """
    client = await get_http_client()
    headers = {
        "Authorization": f"Discogs token={settings.DISCOGS_API_KEY}",
        "User-Agent": settings.USER_AGENT,
    }
    url = f"{settings.DISCOGS_API_URL}/artists/{artist_id}"
    try:
        artist_data = await make_http_request(url, headers)
        if not artist_data:
            return {}
        return artist_data
    except Exception as e:
        logger.error(f"Error fetching artist metadata {artist_id}: {str(e)}")
        return {}


async def get_album_metadata(album_id: str) -> dict:
    """
    Fetch album metadata from Discogs.
    Return empty dict on 404.
    """
    client = await get_http_client()
    headers = {
        "Authorization": f"Discogs token={settings.DISCOGS_API_KEY}",
        "User-Agent": settings.USER_AGENT,
    }
    url = f"{settings.DISCOGS_API_URL}/releases/{album_id}"
    try:
        album_data = await make_http_request(url, headers)
        if not album_data:
            return {}
        return album_data
    except Exception as e:
        logger.error(f"Error fetching album metadata {album_id}: {str(e)}")
        return {}
