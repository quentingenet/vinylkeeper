import re
import string
from typing import List, Set, Optional, Tuple, Dict, Any
from urllib.parse import urlparse

import httpx
from app.core.config_env import settings
from app.core.exceptions import ValidationError, ServerError, ErrorCode
from app.core.logging import logger
from app.utils.discogs_release import parse_release_edition
from app.schemas.request_proxy.request_proxy_schema import (
    AlbumMetadata,
    SearchQuery,
    DiscogsData,
    Artist,
    ArtistMetadata,
    SEARCH_MAX_PAGES,
    SearchResultsPage,
    Track,
)


DISCOGS_IMAGE_HOST = "i.discogs.com"
# 4 columns x 3 rows on desktop
SEARCH_PAGE_SIZE = 12


class SearchService:
    """
    Service that queries Discogs for artists or releases,
    filters to vinyl formats only and deduplicates. Images come from the search hits.
    """

    VINYL_FORMAT_PATTERNS = [
        r"vinyl",
        r"lp",
        r"\d+t",
        r"\bep\b"
    ]

    def __init__(self, http_client: Optional[httpx.AsyncClient] = None):
        self.token = settings.DISCOGS_API_KEY
        self.base_url = settings.DISCOGS_API_URL
        self.search_url = f"{self.base_url}/database/search"
        self.http_client = http_client

    @staticmethod
    def normalize(text: Optional[str]) -> str:
        """Lowercase and strip punctuation/whitespace for dedup keys."""
        if not text:
            return ""
        txt = text.lower().strip()
        return txt.translate(str.maketrans("", "", string.punctuation))

    @staticmethod
    def _hit_image(url: Optional[str]) -> Optional[str]:
        """A real Discogs image, or None (search hits use a spacer.gif placeholder when there is none)."""
        return url if url and urlparse(url).hostname == DISCOGS_IMAGE_HOST else None

    @staticmethod
    def resize_to_medium(url: str) -> str:
        """Rewrite Discogs thumbnail URL dimensions to 300×300."""
        return re.sub(r"/h:\d+/w:\d+/", "/h:300/w:300/", url)

    async def _search_discogs(
        self, query: str, entity: str, page: int = 1, client: Optional[httpx.AsyncClient] = None
    ) -> Dict[str, Any]:
        """Perform Discogs database search for artist or release: the raw results and pagination."""
        client_to_use = client or self.http_client
        if not client_to_use:
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="HTTP client not available"
            )
        params: Dict[str, Any] = {
            "q": query,
            "type": entity,
            "per_page": SEARCH_PAGE_SIZE,
            "page": page,
        }
        if entity == "release":
            # Filtered by Discogs so that every page is full of vinyls
            params["format"] = "Vinyl"
        try:
            response = await client_to_use.get(
                self.search_url,
                params=params,
                headers={"Authorization": f"Discogs token={self.token}"},
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Discogs API error: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.EXTERNAL_SERVICE_ERROR,
                message="Failed to search Discogs"
            )

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

        labels = hit.get("label") or []
        master_id = hit.get("master_id")
        discogs = DiscogsData(
            id=str(hit.get("id")),
            title=title,
            type="album",
            year=str(hit["year"]) if hit.get("year") else None,
            country=hit.get("country") or None,
            label=labels[0] if labels else None,
            catno=hit.get("catno") or None,
            # Every result is vinyl: "Vinyl" itself tells nothing about the edition
            formats=list(dict.fromkeys(f for f in hit.get("format") or [] if f != "Vinyl")),
            # Discogs sends 0 for releases without a master
            master_id=str(master_id) if master_id else None,
        )
        if artist_name:
            discogs.artist = Artist(id="", name=artist_name, type="artist")
        return discogs

    @classmethod
    def _release_key(cls, hit: Dict[str, Any]) -> Tuple[str, ...]:
        """Same album and same visible edition: different pressings stay apart."""
        labels = hit.get("label") or []
        return (
            cls.normalize(hit.get("title")),
            cls.normalize(hit.get("artist")),
            str(hit.get("year") or ""),
            cls.normalize(hit.get("country")),
            cls.normalize(labels[0] if labels else ""),
            cls.normalize(hit.get("catno")),
        )

    async def search_music(self, search_query: SearchQuery) -> List[DiscogsData]:
        """Results of one page only: kept for clients that do not paginate."""
        return (await self.search_music_page(search_query)).items

    async def search_music_page(self, search_query: SearchQuery) -> SearchResultsPage:
        """
        Search music via Discogs API, one page at a time.

        Args:
            search_query: Search parameters containing query string and search type

        Returns:
            SearchResultsPage: results of the requested page and the number of pages

        Raises:
            ValidationError: If search parameters are invalid
            ServerError: If an error occurs during search or API communication
        """
        q = search_query.query.strip()
        entity = "artist" if search_query.is_artist else "release"

        # Validate search query
        if len(q) < 2:
            raise ValidationError(
                error_code=ErrorCode.INVALID_INPUT,
                message="Search query must be at least 2 characters long",
                details={"query": q, "min_length": 2}
            )
        if len(q) > 100:
            raise ValidationError(
                error_code=ErrorCode.INVALID_INPUT,
                message="Search query must be at most 100 characters long",
                details={"query": q, "max_length": 100}
            )

        try:
            # Make HTTP request using shared client
            response = await self._search_discogs(q, entity, search_query.page)
            response_data = response.get("results") or []
            total_pages = min(response.get("pagination", {}).get("pages") or 1, SEARCH_MAX_PAGES)

            results = []
            seen_ids: Set[int] = set()
            seen_keys: Set[Tuple[str, ...]] = set()

            for item in response_data[:SEARCH_PAGE_SIZE]:
                try:
                    discogs_data = self._create_discogs_data(
                        item, entity == "artist")
                    if not search_query.is_artist and not self._is_vinyl_format(item.get("format")):
                        continue

                    key = self._release_key(item)
                    if not search_query.is_artist and key in seen_keys:
                        continue

                    seen_ids.add(item.get("id"))
                    seen_keys.add(key)

                    # Search hits already carry the primary image: no extra call per result
                    image = self._hit_image(item.get("cover_image"))
                    discogs_data.picture = image or self._hit_image(item.get("thumb")) or ""
                    if image:
                        discogs_data.picture_medium = self.resize_to_medium(image)

                    results.append(discogs_data)
                except Exception as e:
                    logger.warning(
                        f"Failed to parse search result: {str(e)}")
                    continue

            return SearchResultsPage(items=results, page=search_query.page, total_pages=total_pages)

        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Search error: {str(e)}", exc_info=True)
            raise ServerError(
                error_code=ErrorCode.EXTERNAL_SERVICE_ERROR,
                message="Failed to search music",
                details={}
            )

    async def get_artist_metadata(self, artist_id: str) -> ArtistMetadata:
        """
        Get detailed artist metadata from Discogs API.

        Args:
            artist_id: Unique identifier for the artist in Discogs

        Returns:
            ArtistMetadata: Detailed artist information

        Raises:
            ServerError: If artist not found or API communication fails
        """
        if not artist_id or not artist_id.strip():
            logger.error(f"Invalid artist_id provided: '{artist_id}'")
            raise ServerError(
                error_code=ErrorCode.INVALID_INPUT,
                message="Invalid artist ID provided",
                details={"artist_id": artist_id}
            )

        # Validate that artist_id is numeric
        if not artist_id.isdigit():
            logger.error(f"Non-numeric artist_id provided: '{artist_id}'")
            raise ServerError(
                error_code=ErrorCode.INVALID_INPUT,
                message="Artist ID must be numeric",
                details={"artist_id": artist_id}
            )

        url = f"{self.base_url}/artists/{artist_id}"

        if not self.http_client:
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="HTTP client not available"
            )

        try:
            response = await self.http_client.get(url, headers={"Authorization": f"Discogs token={self.token}"})
            response.raise_for_status()
            data = response.json()

            if not data:
                logger.warning(
                    f"No data returned for artist ID: {artist_id}")
                raise ServerError(
                    error_code=ErrorCode.RESOURCE_NOT_FOUND,
                    message="Artist not found",
                    details={"artist_id": artist_id}
                )
        except httpx.HTTPStatusError as e:
            logger.error(
                f"HTTP error fetching artist metadata for ID {artist_id}: {e.response.status_code} - {e.response.text}")
            if e.response.status_code == 404:
                raise ServerError(
                    error_code=ErrorCode.RESOURCE_NOT_FOUND,
                    message="Artist not found",
                    details={"artist_id": artist_id}
                )
            else:
                raise ServerError(
                    error_code=ErrorCode.EXTERNAL_SERVICE_ERROR,
                    message=f"Discogs API error: {e.response.status_code}",
                    details={"artist_id": artist_id,
                             "status_code": e.response.status_code}
                )
        except Exception as e:
            logger.error(
                f"Unexpected error fetching artist metadata for ID {artist_id}: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.EXTERNAL_SERVICE_ERROR,
                message="Failed to fetch artist metadata",
                details={"artist_id": artist_id}
            )

        # Get artist releases
        try:
            releases_data = await self.http_client.get(
                f"{self.base_url}/artists/{artist_id}/releases",
                headers={"Authorization": f"Discogs token={self.token}"},
            )
            releases_data.raise_for_status()
            releases_data = releases_data.json()

            # Parse releases
            releases = []
            if releases_data and "releases" in releases_data:
                # Limit to 10 releases
                for release in releases_data["releases"][:10]:
                    try:
                        release_info = DiscogsData(
                            id=str(release.get("id", "")),
                            title=release.get("title", ""),
                            type=release.get("type", ""),
                            picture=release.get("thumb", ""),
                            link=release.get("resource_url", "")
                        )
                        releases.append(release_info)
                    except Exception as e:
                        logger.warning(
                            f"Failed to parse release: {str(e)}")
                        continue
        except Exception as e:
            logger.warning(
                f"Failed to fetch artist releases for ID {artist_id}: {str(e)}")
            releases = []

        # Build artist metadata
        artist_metadata = ArtistMetadata(
            id=str(data.get("id", "")),
            title=data.get("name", ""),  # Frontend expects 'title'
            image_url=data.get("images", [{}])[0].get("uri", "") if data.get("images") else "",
            external_url=data.get("uri", ""),
            source="discogs",
            biography=data.get("profile", ""),
            genres=data.get("genres", []),
            country=data.get("country", ""),
            wikipedia_url=None,
            members=[member.get("name", "")
                     for member in data.get("members", [])],
            active_years=data.get("active_years", ""),
            aliases=[alias.get("name", "")
                     for alias in data.get("aliases", [])]
        )

        return artist_metadata

    async def get_album_metadata(self, album_id: str) -> AlbumMetadata:
        """
        Get detailed album metadata from Discogs API.

        Args:
            album_id: Unique identifier for the album in Discogs

        Returns:
            AlbumMetadata: Detailed album information

        Raises:
            ServerError: If album not found or API communication fails
        """
        if not album_id or not album_id.strip():
            logger.error(f"Invalid album_id provided: '{album_id}'")
            raise ServerError(
                error_code=ErrorCode.INVALID_INPUT,
                message="Invalid album ID provided",
                details={"album_id": album_id}
            )

        # Validate that album_id is numeric
        if not album_id.isdigit():
            logger.error(f"Non-numeric album_id provided: '{album_id}'")
            raise ServerError(
                error_code=ErrorCode.INVALID_INPUT,
                message="Album ID must be numeric",
                details={"album_id": album_id}
            )

        url = f"{self.base_url}/releases/{album_id}"

        if not self.http_client:
            raise ServerError(
                error_code=ErrorCode.SERVER_ERROR,
                message="HTTP client not available"
            )

        try:
            response = await self.http_client.get(url, headers={"Authorization": f"Discogs token={self.token}"})
            response.raise_for_status()
            data = response.json()

            if not data:
                logger.warning(
                    f"No data returned for album ID: {album_id}")
                raise ServerError(
                    error_code=ErrorCode.RESOURCE_NOT_FOUND,
                    message="Album not found",
                    details={"album_id": album_id}
                )
        except httpx.HTTPStatusError as e:
            logger.error(
                f"HTTP error fetching album metadata for ID {album_id}: {e.response.status_code} - {e.response.text}")
            if e.response.status_code == 404:
                raise ServerError(
                    error_code=ErrorCode.RESOURCE_NOT_FOUND,
                    message="Album not found",
                    details={"album_id": album_id}
                )
            else:
                raise ServerError(
                    error_code=ErrorCode.EXTERNAL_SERVICE_ERROR,
                    message=f"Discogs API error: {e.response.status_code}",
                    details={"album_id": album_id,
                             "status_code": e.response.status_code}
                )
        except Exception as e:
            logger.error(
                f"Unexpected error fetching album metadata for ID {album_id}: {str(e)}", exc_info=True)
            raise ServerError(
                error_code=ErrorCode.EXTERNAL_SERVICE_ERROR,
                message="Failed to fetch album metadata",
                details={"album_id": album_id}
            )

        # Parse tracks
        tracks = []
        if "tracklist" in data:
            for track in data["tracklist"]:
                try:
                    track_info = Track(
                        position=track.get("position", ""),
                        title=track.get("title", ""),
                        duration=track.get("duration", "")
                    )
                    tracks.append(track_info)
                except Exception as e:
                    logger.warning(f"Failed to parse track: {str(e)}")
                    continue

        # Parse artists
        artists = []
        if "artists" in data:
            for artist in data["artists"]:
                try:
                    artist_info = Artist(
                        id=str(artist.get("id", "")),
                        # Frontend expects 'title', not 'name'
                        title=artist.get("name", ""),
                        type=artist.get("type", "")
                    )
                    artists.append(artist_info)
                except Exception as e:
                    logger.warning(f"Failed to parse artist: {str(e)}")
                    continue

        # Build album metadata
        raw_image_url = data.get("images", [{}])[0].get("uri", "") if data.get("images") else ""
        album_metadata = AlbumMetadata(
            id=str(data.get("id", "")),
            title=data.get("title", ""),
            artist=data.get("artists", [{}])[0].get("name", "") if data.get("artists") else "",
            year=str(data.get("year", "")),
            image_url=raw_image_url,
            genres=data.get("genres", []),
            styles=data.get("styles", []),
            tracklist=tracks,
            source="discogs",
            artists=artists,
            **parse_release_edition(data),
        )

        return album_metadata
