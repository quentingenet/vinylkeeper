"""
Import of a public Discogs collection.

A page of a Discogs collection holds 100 releases with their artists, year, genres, styles,
master, label, catalogue number, formats and cover: everything the enrichment would fetch
release by release, except the country. So 1,500 records cost 15 requests, and the albums
are written already enriched, with their moods. The original year of new masters is left
to the enrichment job.

Imports run one at a time on the whole server (a Postgres advisory lock), at one request
every IMPORT_MIN_INTERVAL_SECONDS: the Discogs rate limit is shared with the live search.
"""
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from urllib.parse import quote

import httpx
from sqlalchemy import func, select

from app.core.exceptions import ErrorCode, ServerError, ValidationError
from app.core.logging import logger
from app.db.session import AsyncSessionLocal, engine
from app.models.discogs_import_model import DiscogsImport
from app.repositories.collection_repository import CollectionRepository
from app.repositories.discogs_import_repository import DiscogsImportRepository
from app.repositories.mood_assignment_repository import MoodAssignmentRepository
from app.services.album_enrichment_service import (
    IMAGE_URL_MAX_LENGTH,
    DiscogsAccessDeniedError,
    DiscogsClient,
    DiscogsUnavailableError,
    parse_release,
)
from app.services.collection_service import save_collection_copy
from app.services.mood_assignment_service import MoodAssignmentService
from app.utils.discogs_release import is_discogs_image

PAGE_SIZE = 100  # the largest page Discogs serves
MAX_ITEMS = 10_000
# Half of the 60 requests/minute of the token: the other half stays for the live search
IMPORT_MIN_INTERVAL_SECONDS = 2.0
WRITE_BATCH_SIZE = 100
# An import not updated for that long belongs to a stopped worker: the next run resumes it
STALE_AFTER = timedelta(minutes=3)
# Any constant bigint identifying the import lock among the advisory locks of the database
IMPORT_LOCK_KEY = 7_420_291_001


class DiscogsImportError(Exception):
    """An import that cannot go on, with the message shown to the user."""

    def __init__(self, message: str, reason: str):
        super().__init__(message)
        self.message = message
        self.reason = reason


def private_collection_error() -> DiscogsImportError:
    return DiscogsImportError(
        "This Discogs collection is private. Make it public in your Discogs privacy settings, then try again.",
        "private",
    )


def user_not_found_error() -> DiscogsImportError:
    return DiscogsImportError("No Discogs user with this name.", "not_found")


def too_large_error(items: int) -> DiscogsImportError:
    return DiscogsImportError(
        f"This collection holds {items} items: imports are limited to {MAX_ITEMS} for now.", "too_large"
    )


def unavailable_error() -> DiscogsImportError:
    return DiscogsImportError("Discogs is not answering right now. Try again in a few minutes.", "unavailable")


def collection_path(username: str, page: int, per_page: int = PAGE_SIZE) -> str:
    # Oldest first: the import adds the records in the order they entered the Discogs collection
    return (f"/users/{quote(username, safe='')}/collection/folders/0/releases"
            f"?per_page={per_page}&page={page}&sort=added&sort_order=asc")


def is_vinyl(basic_information: dict[str, Any]) -> bool:
    """Same scope as the search, which only lists the Discogs "Vinyl" format."""
    return any(isinstance(fmt, dict) and fmt.get("name") == "Vinyl"
               for fmt in basic_information.get("formats") or [])


def parse_collection_release(basic_information: dict[str, Any]) -> dict[str, Any]:
    """Album columns from the basic_information of a collection item: a release without its country."""
    values = parse_release(basic_information)
    cover = basic_information.get("cover_image")
    values["image_url"] = cover if is_discogs_image(cover) and len(cover) <= IMAGE_URL_MAX_LENGTH else None
    # Every row of a multi-row insert has the same columns
    values.setdefault("title", None)
    return values


@dataclass
class CollectedRelease:
    external_id: str
    values: dict[str, Any]
    copies: int = 1


def collect_vinyl_releases(items: list[dict[str, Any]]) -> tuple[list[CollectedRelease], int]:
    """
    The vinyl releases of the collection items, in their order, and the number of items left out.
    Owning a release twice gives two items (two Discogs instances): two copies of one album.
    """
    releases: dict[str, CollectedRelease] = {}
    skipped = 0
    for item in items:
        basic = item.get("basic_information") or {}
        release_id = basic.get("id") or item.get("id")
        if not isinstance(release_id, int) or release_id <= 0 or not is_vinyl(basic):
            skipped += 1
            continue
        external_id = str(release_id)
        if external_id in releases:
            releases[external_id].copies += 1
        else:
            releases[external_id] = CollectedRelease(external_id, parse_collection_release(basic))
    return list(releases.values()), skipped


def describe_import(job: DiscogsImport, username: Optional[str], collection_name: Optional[str]) -> str:
    """Who imports what into which collection, for the logs. Names quoted: they are typed by users."""
    target = "new collection" if job.created_collection else "collection"
    saved = f", saved first as {job.saved_copy_name!r}" if job.saved_copy_name else ""
    return (f"Discogs import {job.id}: user {username!r} imports Discogs user {job.discogs_username!r} "
            f"into {target} {collection_name!r} (id {job.collection_id}){saved}")


class DiscogsImportService:
    def __init__(self, repository: DiscogsImportRepository, client: Optional[DiscogsClient] = None):
        self.repository = repository
        self.client = client

    # Requests of the user

    async def preview(self, discogs_username: str) -> int:
        """Number of items of the public collection. One small request."""
        data = await self._get(collection_path(discogs_username, page=1, per_page=1))
        return int((data.get("pagination") or {}).get("items") or 0)

    async def create_import(
        self, user_id: int, collection_id: Optional[int], discogs_username: str, save_copy: bool = False
    ) -> DiscogsImport:
        """
        Queue an import into one of the user's collections, or into a new one when collection_id is
        None: the records then mix with nothing, and deleting that collection undoes the import.
        """
        if await self.repository.has_active_import(user_id):
            raise ValidationError(
                error_code=ErrorCode.INVALID_RESOURCE_STATE,
                message="An import is already in progress: wait for it to finish",
                details={},
            )
        created_collection = collection_id is None
        saved_copy = None
        if created_collection:
            collection = await self.repository.create_collection(
                user_id, f"Discogs import ({discogs_username})", "Imported from Discogs"
            )
            collection_id = collection.id
        else:
            collection = await self.repository.find_owned_collection(collection_id, user_id)
            if not collection:
                raise ValidationError(
                    error_code=ErrorCode.FORBIDDEN_OWNER,
                    message="Records can only be imported into one of your collections",
                    details={"collection_id": collection_id},
                )
            if save_copy and collection.saved_from_collection_id is None:
                # One save per collection: an existing one is kept as the copy to restore from.
                # Same commit as the import: no import without its saved copy.
                collection_repository = CollectionRepository(self.repository.db)
                saved_copy = (await collection_repository.find_save_of(collection.id)
                              or await save_collection_copy(collection_repository, collection))
        job = await self.repository.create_import(
            user_id, collection_id, discogs_username, created_collection, saved_copy)
        await self.repository.db.commit()
        logger.info(f"{describe_import(job, *await self.repository.import_labels(user_id, collection_id))}: queued")
        return job

    async def latest_import(self, user_id: int) -> tuple[Optional[DiscogsImport], bool]:
        """The latest import of the user, and whether it waits for a run that will not come (stopped worker)."""
        job = await self.repository.latest_import(user_id)
        stalled = bool(
            job and job.status in ("queued", "running")
            and job.updated_at < datetime.now(timezone.utc) - STALE_AFTER
        )
        return job, stalled

    # The run

    async def run_import(self, job: DiscogsImport) -> None:
        """Run one import to its end: done, or failed with a message for the user. Never raises."""
        db = self.repository.db
        job.status = "running"
        await db.commit()
        # Read now: a failed import may remove its collection, the logs keep its name
        description = describe_import(job, *await self.repository.import_labels(job.user_id, job.collection_id))
        logger.info(f"{description}: started")
        try:
            if job.collection_id is None:
                raise DiscogsImportError("The collection of this import was deleted.", "collection_deleted")
            # Before anything is written: the works already there tell "another pressing" apart
            masters_before = await self.repository.masters_in_collection(job.collection_id)
            items = await self._fetch_collection(job)
            releases, skipped = collect_vinyl_releases(items)
            job.vinyl_found, job.other_formats = len(releases), skipped
            await db.commit()
            for start in range(0, len(releases), WRITE_BATCH_SIZE):
                await self._write_batch(job, releases[start:start + WRITE_BATCH_SIZE], masters_before)
            job.status = "done"
        except DiscogsImportError as e:
            await self._reset_after_failure(job)
            job.status, job.error_message = "failed", e.message
        except Exception as e:
            logger.error(f"Discogs import {job.id} failed: {str(e)}", exc_info=True)
            await self._reset_after_failure(job)
            job.status, job.error_message = "failed", "The import stopped on an unexpected error. Try again."
        if job.status == "failed" and job.created_collection and job.collection_id:
            await self.repository.delete_empty_collection(job.collection_id)
            await db.flush()
            await db.refresh(job)
        job.finished_at = datetime.now(timezone.utc)
        await db.commit()
        if job.status == "done":
            logger.info(
                f"{description}: done, {job.vinyl_found} vinyls found, {job.added} added "
                f"({job.copies_added} copies), {job.already_in_collection} already there, "
                f"{job.other_pressings} other pressings, {job.in_other_collections} in other collections, "
                f"{job.other_formats} other formats skipped, {job.pages_total} Discogs pages"
            )
        else:
            logger.warning(f"{description}: failed, {job.error_message}")

    async def _reset_after_failure(self, job: DiscogsImport) -> None:
        """Drop the batch in progress; the counters go back to what the committed batches wrote."""
        await self.repository.db.rollback()
        await self.repository.db.refresh(job)

    async def _get(self, path: str) -> dict[str, Any]:
        try:
            data = await self.client.get(path)
        except DiscogsAccessDeniedError:
            raise private_collection_error()
        except DiscogsUnavailableError:
            raise unavailable_error()
        if data is None:
            raise user_not_found_error()
        return data

    async def _fetch_collection(self, job: DiscogsImport) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        page = 1
        while True:
            data = await self._get(collection_path(job.discogs_username, page))
            pagination = data.get("pagination") or {}
            job.items_total = int(pagination.get("items") or 0)
            if job.items_total > MAX_ITEMS:
                raise too_large_error(job.items_total)
            job.pages_total = max(int(pagination.get("pages") or 1), 1)
            items.extend(data.get("releases") or [])
            job.pages_done = page
            await self.repository.db.commit()
            if page >= job.pages_total:
                return items
            page += 1

    async def _write_batch(
        self, job: DiscogsImport, releases: list[CollectedRelease], masters_before: set[str]
    ) -> None:
        """Albums, collection rows and moods of up to WRITE_BATCH_SIZE releases, in one commit."""
        repository = self.repository
        source_id = await repository.discogs_source_id()
        known = await repository.albums_by_external_id(source_id, (r.external_id for r in releases))

        await repository.insert_albums([
            {**r.values, "external_album_id": r.external_id, "external_source_id": source_id}
            for r in releases if r.external_id not in known
        ])
        written = {r.external_id for r in releases if r.external_id not in known}
        for release in releases:
            entry = known.get(release.external_id)
            if entry and entry[1]:
                # Added by a user but not enriched yet: these are the values the enrichment would fetch.
                # A missing Discogs title or cover keeps the one the album has.
                await repository.fill_pending_album(entry[0], {
                    key: value for key, value in release.values.items()
                    if value is not None or key not in ("title", "image_url")
                })
                written.add(release.external_id)
        album_ids = {external_id: album_id
                     for external_id, (album_id, _) in
                     (await repository.albums_by_external_id(source_id, (r.external_id for r in releases))).items()}

        present = await repository.album_ids_in_collection(job.collection_id, album_ids.values())
        elsewhere = await repository.album_ids_in_other_collections(
            job.user_id, job.collection_id, album_ids.values())
        for release in releases:
            album_id = album_ids.get(release.external_id)
            if album_id is None:
                continue
            if album_id not in present and await repository.add_album_with_copies(
                    job.collection_id, album_id, release.copies):
                job.added += 1
                job.copies_added += release.copies
                # Reported in the summary, for the owner to check (a pressing picked by mistake before)
                if release.values.get("external_master_id") in masters_before:
                    job.other_pressings += 1
                if album_id in elsewhere:
                    job.in_other_collections += 1
            else:
                job.already_in_collection += 1

        enriched_now = [album_ids[external_id] for external_id in written]
        if enriched_now:
            await MoodAssignmentService(MoodAssignmentRepository(repository.db)).assign(enriched_now)
        await repository.db.commit()


async def run_discogs_imports() -> None:
    """
    Background task scheduled when an import is created: runs the queued imports one after
    the other. A run already going on in another worker takes the new import instead.
    Never raises.
    """
    try:
        while await _run_queued_imports_once():
            # The lock is released: an import queued just before is not left waiting
            async with AsyncSessionLocal() as db:
                if not await DiscogsImportRepository(db).has_queued_import():
                    return
    except Exception as e:
        logger.error(f"Discogs imports run failed: {str(e)}", exc_info=True)


async def _run_queued_imports_once() -> bool:
    """Run the queued imports while holding the import lock. False when another run holds it."""
    async with engine.connect() as lock_connection:
        if not (await lock_connection.execute(select(func.pg_try_advisory_lock(IMPORT_LOCK_KEY)))).scalar():
            return False
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(30.0, connect=10.0)) as http_client:
                client = DiscogsClient(http_client, min_interval=IMPORT_MIN_INTERVAL_SECONDS)
                async with AsyncSessionLocal() as db:
                    repository = DiscogsImportRepository(db)
                    service = DiscogsImportService(repository, client)
                    # Holding the lock: nothing else runs an import, a "running" one was left by a stopped worker
                    if await repository.requeue_running_imports():
                        await db.commit()
                    while job := await repository.next_queued_import():
                        await service.run_import(job)
        finally:
            await lock_connection.execute(select(func.pg_advisory_unlock(IMPORT_LOCK_KEY)))
        return True


def raise_for_preview(error: DiscogsImportError) -> None:
    """The preview error as an API error: a bad name or a private collection is the user's to fix."""
    if error.reason == "unavailable":
        raise ServerError(error_code=ErrorCode.EXTERNAL_SERVICE_ERROR, message=error.message,
                          details={"reason": error.reason})
    raise ValidationError(error_code=ErrorCode.INVALID_INPUT, message=error.message, details={"reason": error.reason})

