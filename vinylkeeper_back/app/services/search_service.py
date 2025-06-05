import re
import string
from typing import List, Set, Optional, Tuple, Dict, Any

import requests
from requests.exceptions import RequestException

from app.core.config_env import settings
from app.core.exceptions import ValidationError, ServerError, ErrorCode
from app.core.logging import logger
from app.schemas.request_proxy.request_proxy_schema import (
    AlbumMetadata,
    SearchQuery,
    DiscogsData,
    Artist,
    ArtistMetadata,
    Track,
)


class ImageFetcher:
    """Helper class to handle image fetching logic for both artists and releases."""

    def __init__(self, token: str, base_url: str):
        self.token = token
        self.base_url = base_url
        self.headers = {"Authorization": f"Discogs token={self.token}"}

    def fetch_images(self, entity_type: str, entity_id: int, hit: Dict[str, Any]) -> Tuple[Optional[str], Optional[str]]:
        """Generic method to fetch images for both artists and releases."""
        if entity_type == "artist":
            return self._fetch_artist_images(entity_id, hit)
        return self._fetch_release_images(entity_id, hit)

    def _fetch_artist_images(self, artist_id: int, hit: Dict[str, Any]) -> Tuple[Optional[str], Optional[str]]:
        """Fetch images for an artist."""
        thumb = hit.get("thumb")
        if not artist_id:
            return None, thumb

        try:
            resp = self._make_request(f"{self.base_url}/artists/{artist_id}")
            images = resp.get("images", [])
            if images:
                primary = next((i for i in images if i.get("type") == "primary"), images[0])
                return primary.get("uri"), primary.get("uri150") or thumb
        except RequestException as e:
            logger.warning(f"Failed to fetch artist images: {str(e)}")
        return None, thumb

    def _fetch_release_images(self, release_id: int, hit: Dict[str, Any]) -> Tuple[Optional[str], Optional[str]]:
        """Fetch images for a release."""
        cover = hit.get("cover_image")
        thumb = hit.get("thumb")
        if not release_id:
            return cover, thumb

        try:
            resp = self._make_request(f"{self.base_url}/releases/{release_id}")
            images = resp.get("images", [])
            if images:
                front = next(
                    (i for i in images if i.get("type") in ("primary", "secondary")),
                    images[0],
                )
                return front.get("uri"), front.get("uri150") or thumb
        except RequestException as e:
            logger.warning(f"Failed to fetch release images: {str(e)}")
        return cover, thumb

    def _make_request(self, url: str) -> Dict[str, Any]:
        """Make HTTP request with proper error handling."""
        response = requests.get(url, headers=self.headers)
        response.raise_for_status()
        return response.json()


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

    def __init__(self):
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

    def _search_discogs(self, query: str, entity: str) -> List[dict]:
        """Perform Discogs database search for artist or release."""
        params = {
            "q": query,
            "type": entity,
            "token": self.token,
            "per_page": 15,
        }
        try:
            response = requests.get(self.search_url, params=params)
            response.raise_for_status()
            return response.json().get("results", [])
        except RequestException as e:
            logger.error(f"Discogs API error: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.EXTERNAL_API_ERROR,
                message=f"Failed to search Discogs: {str(e)}"
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

        discogs = DiscogsData(id=str(hit.get("id")), title=title, type="album")
        if artist_name:
            discogs.artist = Artist(id="", name=artist_name, type="artist")
        return discogs

    def search_music(self, search_query: SearchQuery) -> List[DiscogsData]:
        """
        Search music via Discogs API.

        Args:
            search_query: Search parameters containing query string and search type

        Returns:
            List[DiscogsData]: List of search results matching the query

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
            # Build search URL
            search_url = f"{self.base_url}/database/search"
            params = {
                "q": q,
                "type": entity,
                "token": self.token,
                "per_page": 15,
            }

            # Make HTTP request
            response = requests.get(search_url, params=params)
            response.raise_for_status()
            
            response_data = response.json()
            if not response_data or "results" not in response_data:
                return []

            results = []
            seen_ids: Set[int] = set()
            seen_keys: Set[Tuple[str, str]] = set()

            for item in response_data["results"][:10]:  # Limit to 10 results
                try:
                    discogs_data = self._create_discogs_data(item, entity == "artist")
                    if not search_query.is_artist and not self._is_vinyl_format(item.get("format")):
                        continue

                    title = item.get("title") or ""
                    artist_name = item.get("artist") or ""
                    key = (self.normalize(title), self.normalize(artist_name))
                    if not search_query.is_artist and key in seen_keys:
                        continue

                    seen_ids.add(item.get("id"))
                    seen_keys.add(key)

                    try:
                        full, thumb = self.image_fetcher.fetch_images(
                            "artist" if discogs_data.type == "artist" else "release",
                            int(discogs_data.id),
                            item
                        )
                        discogs_data.picture = full or thumb
                        discogs_data.picture_small = thumb
                        if full:
                            discogs_data.picture_medium = self.resize_to_medium(full)
                    except Exception as e:
                        logger.warning(f"Failed to fetch images for {discogs_data.id}: {str(e)}")

                    results.append(discogs_data)
                except Exception as e:
                    logger.warning(f"Failed to parse search result: {str(e)}")
                    continue

            return results

        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Search error: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.EXTERNAL_SERVICE_ERROR,
                message="Failed to search music",
                details={"error": str(e)}
            )

    def get_artist_metadata(self, artist_id: str) -> ArtistMetadata:
        """
        Get detailed artist metadata from Discogs API.

        Args:
            artist_id: Unique identifier for the artist in Discogs

        Returns:
            ArtistMetadata: Detailed artist information

        Raises:
            ServerError: If artist not found or API communication fails
        """
        try:
            # Get artist data
            response = requests.get(f"{self.base_url}/artists/{artist_id}", headers=self.image_fetcher.headers)
            response.raise_for_status()
            artist_data = response.json()

            if not artist_data:
                raise ServerError(
                    error_code=ErrorCode.RESOURCE_NOT_FOUND,
                    message="Artist not found",
                    details={"artist_id": artist_id}
                )

            # Get artist releases
            releases_data = requests.get(f"{self.base_url}/artists/{artist_id}/releases", headers=self.image_fetcher.headers).json()
            
            # Parse releases
            releases = []
            if releases_data and "releases" in releases_data:
                for release in releases_data["releases"][:10]:  # Limit to 10 releases
                    try:
                        release_info = DiscogsData(
                            id=str(release.get("id", "")),
                            title=release.get("title", ""),
                            type=release.get("type", ""),
                            thumb=release.get("thumb", ""),
                            resource_url=release.get("resource_url", "")
                        )
                        releases.append(release_info)
                    except Exception as e:
                        logger.warning(f"Failed to parse release: {str(e)}")
                        continue

            # Build artist metadata
            artist_metadata = ArtistMetadata(
                id=str(artist_data.get("id", "")),
                name=artist_data.get("name", ""),
                image_url=artist_data.get("images", [{}])[0].get("uri", ""),
                external_url=artist_data.get("uri", ""),
                source="discogs",
                biography=artist_data.get("profile", ""),
                genres=artist_data.get("genres", []),
                country=artist_data.get("country", ""),
                wikipedia_url=None,
                members=[member.get("name", "") for member in artist_data.get("members", [])],
                active_years=artist_data.get("active_years", ""),
                aliases=[alias.get("name", "") for alias in artist_data.get("aliases", [])],
                releases=releases
            )

            return artist_metadata

        except ServerError:
            raise
        except Exception as e:
            logger.error(f"Artist metadata error: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.EXTERNAL_SERVICE_ERROR,
                message="Failed to get artist metadata",
                details={"error": str(e)}
            )

    def get_album_metadata(self, album_id: str) -> AlbumMetadata:
        """
        Get detailed album metadata from Discogs API.

        Args:
            album_id: Unique identifier for the album in Discogs

        Returns:
            AlbumMetadata: Detailed album information

        Raises:
            ServerError: If album not found or API communication fails
        """
        try:
            # Get album data
            response = requests.get(f"{self.base_url}/releases/{album_id}", headers=self.image_fetcher.headers)
            response.raise_for_status()
            album_data = response.json()

            if not album_data:
                raise ServerError(
                    error_code=ErrorCode.RESOURCE_NOT_FOUND,
                    message="Album not found",
                    details={"album_id": album_id}
                )

            # Parse tracks
            tracks = []
            if "tracklist" in album_data:
                for track in album_data["tracklist"]:
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
            if "artists" in album_data:
                for artist in album_data["artists"]:
                    try:
                        artist_info = Artist(
                            id=str(artist.get("id", "")),
                            name=artist.get("name", ""),
                            type=artist.get("type", ""),
                            role=artist.get("role", "")
                        )
                        artists.append(artist_info)
                    except Exception as e:
                        logger.warning(f"Failed to parse artist: {str(e)}")
                        continue

            # Build album metadata
            album_metadata = AlbumMetadata(
                id=str(album_data.get("id", "")),
                title=album_data.get("title", ""),
                artist=album_data.get("artists", [{}])[0].get("name", ""),
                year=str(album_data.get("year", "")),
                image_url=album_data.get("images", [{}])[0].get("uri", ""),
                genres=album_data.get("genres", []),
                styles=album_data.get("styles", []),
                tracklist=tracks,
                source="discogs",
                artists=artists
            )

            return album_metadata

        except ServerError:
            raise
        except Exception as e:
            logger.error(f"Album metadata error: {str(e)}")
            raise ServerError(
                error_code=ErrorCode.EXTERNAL_SERVICE_ERROR,
                message="Failed to get album metadata",
                details={"error": str(e)}
            )
