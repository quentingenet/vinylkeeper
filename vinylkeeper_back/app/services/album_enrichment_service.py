"""
Discogs enrichment of albums: genres, styles, years, master and artist names.

Discogs is an ingestion source only: metadata is fetched once per album and
stored, so features built on it never call Discogs at request time.
"""
import asyncio
import re
import time
from dataclasses import dataclass, field
from typing import Any, Optional

import httpx

from app.core.config_env import settings
from app.core.logging import logger
from app.db.session import AsyncSessionLocal
from app.repositories.album_enrichment_repository import AlbumEnrichmentRepository

DISCOGS_MIN_INTERVAL_SECONDS = 1.05  # authenticated limit is 60 requests/minute
RATE_LIMIT_BACKOFF_SECONDS = (5, 10, 20, 40, 60)
LOW_REMAINING_THRESHOLD = 2
LOW_REMAINING_PAUSE_SECONDS = 10

_DISAMBIGUATION_SUFFIX = re.compile(r"\s*\(\d+\)$")


class DiscogsUnavailableError(Exception):
    """Transient failure (rate limit exhausted, 5xx, network): retry later."""


class DiscogsClient:
    """Minimal Discogs client that spaces requests and backs off on 429."""

    def __init__(
        self,
        http_client: httpx.AsyncClient,
        max_attempts: int = len(RATE_LIMIT_BACKOFF_SECONDS),
        min_interval: float = DISCOGS_MIN_INTERVAL_SECONDS,
    ):
        self.http_client = http_client
        self.max_attempts = max_attempts
        self.min_interval = min_interval
        self._last_request_at = 0.0
        self.headers = {
            "Authorization": f"Discogs token={settings.DISCOGS_API_KEY}",
            "User-Agent": settings.USER_AGENT,
        }

    async def _throttle(self) -> None:
        wait = self.min_interval - (time.monotonic() - self._last_request_at)
        if wait > 0:
            await asyncio.sleep(wait)
        self._last_request_at = time.monotonic()

    async def get(self, path: str) -> Optional[dict[str, Any]]:
        """GET a Discogs resource. Returns None on 404, raises DiscogsUnavailableError otherwise."""
        url = f"{settings.DISCOGS_API_URL}{path}"
        for attempt in range(self.max_attempts):
            await self._throttle()
            try:
                response = await self.http_client.get(url, headers=self.headers)
            except httpx.HTTPError as e:
                raise DiscogsUnavailableError(f"Network error on {path}: {e}") from e

            if response.status_code == 429:
                if attempt + 1 < self.max_attempts:
                    await asyncio.sleep(RATE_LIMIT_BACKOFF_SECONDS[attempt % len(RATE_LIMIT_BACKOFF_SECONDS)])
                continue
            if response.status_code == 404:
                return None
            if response.status_code >= 400:
                raise DiscogsUnavailableError(f"Discogs returned {response.status_code} on {path}")

            remaining = response.headers.get("X-Discogs-Ratelimit-Remaining")
            if remaining is not None and remaining.isdigit() and int(remaining) <= LOW_REMAINING_THRESHOLD:
                await asyncio.sleep(LOW_REMAINING_PAUSE_SECONDS)
            return response.json()
        raise DiscogsUnavailableError(f"Rate limited on {path} after {self.max_attempts} attempts")


def _year_or_none(value: Any) -> Optional[int]:
    """Discogs uses 0 (or nothing) for an unknown year."""
    return value if isinstance(value, int) and 1000 <= value <= 2999 else None


def _clean_tags(values: Any) -> list[str]:
    seen: dict[str, None] = {}
    for value in values or []:
        if isinstance(value, str) and value.strip():
            seen.setdefault(value.strip(), None)
    return list(seen)


def _clean_artist_name(name: str) -> str:
    """'Wings (2)' -> 'Wings', 'Hirt*' -> 'Hirt' (Discogs disambiguation markers)."""
    return _DISAMBIGUATION_SUFFIX.sub("", name.strip()).rstrip("*").strip()


def parse_release(data: dict[str, Any]) -> dict[str, Any]:
    """Map a Discogs /releases/{id} payload to album columns."""
    names = [_clean_artist_name(a.get("name", "")) for a in data.get("artists") or []]
    artist_name = ", ".join(n for n in names if n)[:512] or None
    master_id = data.get("master_id")
    external_master_id = str(master_id) if isinstance(master_id, int) and master_id > 0 else None
    return {
        "external_master_id": external_master_id,
        "release_year": _year_or_none(data.get("year")),
        "artist_name": artist_name,
        "genres": _clean_tags(data.get("genres")),
        "styles": _clean_tags(data.get("styles")),
        # Without a master, the pressing year is the best original year available.
        "original_year": None if external_master_id else _year_or_none(data.get("year")),
        "enrichment_status": "pending_master" if external_master_id else "ok",
    }


def parse_master_year(data: Optional[dict[str, Any]]) -> Optional[int]:
    return _year_or_none(data.get("year")) if data else None


@dataclass
class EnrichmentReport:
    enriched: int = 0
    not_found: int = 0
    failed: list[str] = field(default_factory=list)
    masters_done: int = 0
    master_rows_updated: int = 0


class AlbumEnrichmentService:
    def __init__(self, repository: AlbumEnrichmentRepository, client: DiscogsClient):
        self.repository = repository
        self.client = client

    async def enrich_release(self, album_id: int, external_album_id: str) -> str:
        """Fetch one release. Returns 'enriched' or 'not_found'; raises DiscogsUnavailableError."""
        data = await self.client.get(f"/releases/{external_album_id}")
        if data is None:
            await self.repository.mark_release_not_found(album_id)
            return "not_found"
        await self.repository.save_release(album_id, parse_release(data))
        return "enriched"

    async def enrich_master(self, external_master_id: str) -> int:
        """Resolve the original year of a master, reusing a known value when possible."""
        original_year = await self.repository.find_known_original_year(external_master_id)
        if original_year is None:
            original_year = parse_master_year(await self.client.get(f"/masters/{external_master_id}"))
        return await self.repository.save_master_year(external_master_id, original_year)

    async def enrich_pending_releases(
        self, limit: Optional[int] = None, commit_every: int = 25, report: Optional[EnrichmentReport] = None
    ) -> EnrichmentReport:
        report = report or EnrichmentReport()
        pending = await self.repository.list_pending_releases(limit)
        logger.info(f"Album enrichment: {len(pending)} release(s) to fetch")
        for index, (album_id, external_album_id) in enumerate(pending, 1):
            try:
                outcome = await self.enrich_release(album_id, external_album_id)
                if outcome == "enriched":
                    report.enriched += 1
                else:
                    report.not_found += 1
            except DiscogsUnavailableError as e:
                logger.warning(f"Album enrichment: release {external_album_id} skipped: {e}")
                report.failed.append(external_album_id)
            if index % commit_every == 0:
                await self.repository.db.commit()
                logger.info(f"Album enrichment: {index}/{len(pending)} releases processed")
        await self.repository.db.commit()
        return report

    async def enrich_pending_masters(
        self, limit: Optional[int] = None, commit_every: int = 25, report: Optional[EnrichmentReport] = None
    ) -> EnrichmentReport:
        report = report or EnrichmentReport()
        masters = await self.repository.list_pending_masters(limit)
        logger.info(f"Album enrichment: {len(masters)} master(s) to fetch")
        for index, external_master_id in enumerate(masters, 1):
            try:
                report.master_rows_updated += await self.enrich_master(external_master_id)
                report.masters_done += 1
            except DiscogsUnavailableError as e:
                logger.warning(f"Album enrichment: master {external_master_id} skipped: {e}")
                report.failed.append(f"master:{external_master_id}")
            if index % commit_every == 0:
                await self.repository.db.commit()
                logger.info(f"Album enrichment: {index}/{len(masters)} masters processed")
        await self.repository.db.commit()
        return report


async def enrich_album_in_background(external_album_id: str) -> None:
    """
    Enrich a newly added album after the response is sent.

    Never raises: any failure leaves the album pending, and the CLI backfill
    (python -m app.cli.enrich_albums) picks it up later.
    """
    if not settings.ALBUM_ENRICHMENT_ENABLED:
        return
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(15.0, connect=5.0)) as http_client:
            async with AsyncSessionLocal() as db:
                repository = AlbumEnrichmentRepository(db)
                album_id = await repository.get_pending_release_by_external_id(external_album_id)
                if album_id is None:
                    return
                # A single attempt: never hold a request worker on Discogs backoff.
                service = AlbumEnrichmentService(repository, DiscogsClient(http_client, max_attempts=1))
                outcome = await service.enrich_release(album_id, external_album_id)
                await db.commit()
                if outcome == "enriched":
                    master = await repository.get_pending_master(album_id)
                    if master:
                        await service.enrich_master(master)
                        await db.commit()
    except Exception as e:  # noqa: BLE001 - background task must never propagate
        logger.warning(f"Background enrichment skipped for album {external_album_id}: {e}")
