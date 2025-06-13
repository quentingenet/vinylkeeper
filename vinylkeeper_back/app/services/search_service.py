import asyncio
import re
import string
from typing import List, Set, Optional, Tuple, Dict, Any

from httpx import HTTPStatusError
from sqlalchemy.orm import Session

from app.core.config_env import settings
from app.core.exceptions import ValidationError, ErrorCode
from app.core.logging import logger
from app.schemas.request_proxy.request_proxy_schema import (
    SearchQuery,
    DiscogsData,
    Artist,
)
from app.utils.http_client import make_http_request, get_http_client


class ImageFetcher:
    """Helper class to handle image fetching logic for both artists and releases."""

    def __init__(self, token: str, base_url: str):
        self.token = token
        self.base_url = base_url
        self.headers = {"Authorization": f"Discogs token={self.token}"}

    async def fetch_images(self, entity_type: str, entity_id: int, hit: Dict[str, Any]) -> Tuple[Optional[str], Optional[str]]:
        """Generic method to fetch images for both artists and releases."""
        if entity_type == "artist":
            return await self._fetch_artist_images(entity_id, hit)
        return await self._fetch_release_images(entity_id, hit)

    async def _fetch_artist_images(self, artist_id: int, hit: Dict[str, Any]) -> Tuple[Optional[str], Optional[str]]:
        """Fetch images for an artist."""
        thumb = hit.get("thumb")
        if not artist_id:
            return None, thumb

        try:
            resp = await self._make_request(f"{self.base_url}/artists/{artist_id}")
            images = resp.get("images", [])
            if images:
                primary = next((i for i in images if i.get(
                    "type") == "primary"), images[0])
                return primary.get("uri"), primary.get("uri150") or thumb
        except HTTPStatusError:
            pass
        return None, thumb

    async def _fetch_release_images(self, release_id: int, hit: Dict[str, Any]) -> Tuple[Optional[str], Optional[str]]:
        """Fetch images for a release."""
        cover = hit.get("cover_image")
        thumb = hit.get("thumb")
        if not release_id:
            return cover, thumb

        try:
            resp = await self._make_request(f"{self.base_url}/releases/{release_id}")
            images = resp.get("images", [])
            if images:
                front = next(
                    (i for i in images if i.get("type")
                     in ("primary", "secondary")),
                    images[0],
                )
                return front.get("uri"), front.get("uri150") or thumb
        except HTTPStatusError:
            pass
        return cover, thumb

    async def _make_request(self, url: str) -> Dict[str, Any]:
        """Make HTTP request with proper error handling."""
        client = await get_http_client()
        resp = await client.get(url, headers=self.headers)
        resp.raise_for_status()
        return resp.json()


class SearchService:
    """
    Service that queries Discogs for artists or releases,
    filters to vinyl formats only, deduplicates, and fetches images.
    """

    VINYL_FORMAT_PATTERNS = [
        r"vinyl",
        r"lp",
        r"\d+t",
        r"\bep\b"
    ]

    def __init__(self, db: Session):
        self.db = db
        self.token = settings.DISCOGS_API_KEY
        self.base_url = settings.DISCOGS_API_URL
        self.search_url = f"{self.base_url}/database/search"
        self.image_fetcher = ImageFetcher(self.token, self.base_url)

    @staticmethod
    def normalize(text: Optional[str]) -> str:
        """Lowercase and strip punctuation/whitespace for dedup keys."""
        if not text:
            return ""
        txt = text.lower().strip()
        return txt.translate(str.maketrans("", "", string.punctuation))

    @staticmethod
    def resize_to_medium(url: str) -> str:
        """Rewrite Discogs thumbnail URL dimensions to 300×300."""
        return re.sub(r"/h:\d+/w:\d+/", "/h:300/w:300/", url)

    async def _search_discogs(self, query: str, entity: str) -> List[dict]:
        """Perform Discogs database search for artist or release."""
        params = {
            "q": query,
            "type": entity,
            "token": self.token,
            "per_page": 15,
        }
        return (await make_http_request(self.search_url, params)).get("results", [])

    def _is_vinyl_format(self, formats: List[str]) -> bool:
        """Check if any of the formats matches vinyl patterns."""
        normalized = [f.lower() for f in formats or []]
        return any(
            re.search(pat, fmt) for fmt in normalized for pat in self.VINYL_FORMAT_PATTERNS
        )

    def _create_discogs_data(self, hit: Dict[str, Any], is_artist: bool) -> DiscogsData:
        """Create DiscogsData object from hit data."""
        title = hit.get("title") or ""
        artist_name = hit.get("artist") or ""

        if is_artist:
            return DiscogsData(id=str(hit.get("id")), name=title, type="artist")

        discogs = DiscogsData(id=str(hit.get("id")), title=title, type="album")
        if artist_name:
            discogs.artist = Artist(id="", name=artist_name, type="artist")
        return discogs

    async def search_music(self, search_query: SearchQuery) -> List[DiscogsData]:
        """
        Main entrypoint: filter hits to vinyl, dedupe by title/artist, fetch images.
        Raises ValidationError on invalid query length.
        """
        q = (search_query.query or "").strip()
        if not 2 <= len(q) <= 100:
            raise ValidationError(
                error_code=ErrorCode.INVALID_INPUT,
                message="Search query must be between 2 and 100 characters",
            )

        entity = "artist" if search_query.is_artist else "release"
        hits = await self._search_discogs(q, entity)

        results: List[DiscogsData] = []
        seen_ids: Set[int] = set()
        seen_keys: Set[Tuple[str, str]] = set()
        tasks: List[Tuple[DiscogsData, dict]] = []

        for hit in hits:
            did = hit.get("id")
            if not did or did in seen_ids:
                continue

            if not search_query.is_artist and not self._is_vinyl_format(hit.get("format")):
                continue

            title = hit.get("title") or ""
            artist_name = hit.get("artist") or ""
            key = (self.normalize(title), self.normalize(artist_name))
            if not search_query.is_artist and key in seen_keys:
                continue

            seen_ids.add(did)
            seen_keys.add(key)

            discogs = self._create_discogs_data(hit, search_query.is_artist)
            results.append(discogs)
            tasks.append((discogs, hit))

        # Parallel image fetching
        coroutines = [
            self.image_fetcher.fetch_images(
                "artist" if discogs.type == "artist" else "release",
                int(discogs.id),
                hit
            )
            for discogs, hit in tasks
        ]
        images = await asyncio.gather(*coroutines)

        # Attach images to results
        for (discogs, _), (full, thumb) in zip(tasks, images):
            discogs.picture = full or thumb
            discogs.picture_small = thumb
            if full:
                discogs.picture_medium = self.resize_to_medium(full)

        logger.info(
            f"Discogs search '{q}' ({entity}) → {len(results)} results")
        logger.info(f"Results: {results}")
        return results
