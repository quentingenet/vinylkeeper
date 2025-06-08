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
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        return resp.json()
    except httpx.HTTPError as exc:
        logger.error(f"HTTP request to {url} failed: {exc}")
        raise ServerError(
            error_code=ErrorCode.RESOURCE_NOT_FOUND,
            message="Failed to fetch data from external API",
            details={"error": str(exc)},
        )


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
        resp = await client.get(url, headers=headers)
        if resp.status_code == 404:
            logger.info(f"No Discogs artist found for {artist_id}")
            return {}
        resp.raise_for_status()
        return resp.json()
    except httpx.HTTPError as exc:
        status = getattr(exc.response, "status_code", None)
        if status == 404:
            return {}
        logger.error(f"Discogs API error for artist {artist_id}: {exc}")
        raise ServerError(
            error_code=ErrorCode.RESOURCE_NOT_FOUND,
            message="Failed to fetch Discogs data",
            details={"error": str(exc)},
        )


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
        resp = await client.get(url, headers=headers)
        if resp.status_code == 404:
            logger.info(f"No Discogs artist found for {artist_id}")
            return {}
        resp.raise_for_status()
        return resp.json()
    except httpx.HTTPError as exc:
        status = getattr(exc.response, "status_code", None)
        if status == 404:
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
        resp = await client.get(url, headers=headers)
        if resp.status_code == 404:
            logger.info(f"No Discogs album found for {album_id}")
            return {}
        resp.raise_for_status()
        return resp.json()
    except httpx.HTTPError as exc:
        status = getattr(exc.response, "status_code", None)
        if status == 404:
            return {}
        logger.error(f"Discogs API error for album {album_id}: {exc}")
        raise ServerError(
            error_code=ErrorCode.RESOURCE_NOT_FOUND,
            message="Failed to fetch Discogs data",
            details={"error": str(exc)},
        )
