"""Import of a public Discogs collection: parsing, vinyl filter, pages, and the errors shown to the user."""
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import httpx
import pytest

from app.services.album_enrichment_service import DiscogsAccessDeniedError, DiscogsClient, DiscogsUnavailableError
from app.services.discogs_import_service import (
    MAX_ITEMS,
    DiscogsImportService,
    collect_vinyl_releases,
    collection_path,
    is_vinyl,
    wants_path,
    parse_collection_release,
)

COVER = "https://i.discogs.com/abc/rs:fit/h:582/w:588/cover.jpg"


def basic(release_id=1, formats=("Vinyl",), **overrides):
    return {
        "id": release_id,
        "title": "Kind Of Blue",
        "year": 2019,
        "master_id": 5460,
        "artists": [{"name": "Miles Davis (2)"}],
        "genres": ["Jazz"],
        "styles": ["Modal", "Cool Jazz"],
        "labels": [{"name": "Columbia (2)", "catno": "CS 8163"}],
        "formats": [{"name": name, "descriptions": ["LP", "Album", "Reissue"]} for name in formats],
        "cover_image": COVER,
        **overrides,
    }


def item(release_id=1, formats=("Vinyl",), **overrides):
    return {
        "id": release_id,
        "instance_id": release_id * 10,
        "basic_information": basic(release_id, formats, **overrides),
    }


class TestParsing:
    def test_vinyl_is_told_from_other_formats(self):
        assert is_vinyl(basic(formats=("Vinyl",)))
        assert is_vinyl(basic(formats=("Box Set", "Vinyl")))
        assert not is_vinyl(basic(formats=("CD",)))
        assert not is_vinyl(basic(formats=("Cassette",)))
        assert not is_vinyl({"formats": None})

    def test_release_columns_are_the_ones_the_enrichment_writes(self):
        values = parse_collection_release(basic())

        assert values["title"] == "Miles Davis - Kind Of Blue"
        assert values["artist_name"] == "Miles Davis"
        assert values["image_url"] == COVER
        assert values["genres"] == ["Jazz"] and values["styles"] == ["Modal", "Cool Jazz"]
        assert values["external_master_id"] == "5460"
        assert values["release_year"] == 2019
        # The original year comes from the master, fetched later by the enrichment job
        assert values["original_year"] is None and values["enrichment_status"] == "pending_master"
        assert values["label"] == "Columbia" and values["catno"] == "CS 8163"
        assert values["formats"] == ["LP", "Album", "Reissue"]
        # Not in a collection page
        assert values["country"] is None

    def test_release_without_master_keeps_its_year_as_original_year(self):
        values = parse_collection_release(basic(master_id=0))
        assert values["external_master_id"] is None
        assert values["original_year"] == 2019 and values["enrichment_status"] == "ok"

    def test_cover_outside_the_discogs_cdn_is_left_out(self):
        values = parse_collection_release(basic(cover_image="https://st.discogs.com/images/spacer.gif"))
        assert values["image_url"] is None

    def test_every_release_has_the_same_columns(self):
        """A multi-row insert needs them all, even when Discogs leaves a title or a cover out."""
        full = parse_collection_release(basic())
        sparse = parse_collection_release(basic(title="", cover_image=None))
        assert set(full) == set(sparse)


class TestCollectVinylReleases:
    def test_other_formats_are_counted_and_left_out(self):
        releases, skipped = collect_vinyl_releases([item(1), item(2, formats=("CD",)), item(3)])

        assert [r.external_id for r in releases] == ["1", "3"]
        assert skipped == 1

    def test_a_release_owned_twice_gives_two_copies(self):
        releases, _ = collect_vinyl_releases([item(7), item(8), item(7)])

        assert [(r.external_id, r.copies) for r in releases] == [("7", 2), ("8", 1)]

    def test_items_without_a_valid_release_id_are_left_out(self):
        broken = {"id": None, "basic_information": {"id": "abc", "formats": [{"name": "Vinyl"}]}}
        releases, skipped = collect_vinyl_releases([broken, item(4)])

        assert [r.external_id for r in releases] == ["4"]
        assert skipped == 1


def test_collection_path_escapes_the_username_and_sorts_oldest_first():
    path = collection_path("dj.kent-1", page=2)
    assert path.startswith("/users/dj.kent-1/collection/folders/0/releases?")
    assert "per_page=100" in path and "page=2" in path and "sort=added&sort_order=asc" in path


def make_job():
    return SimpleNamespace(
        id=1, user_id=3, collection_id=5, discogs_username="kent", created_collection=False, saved_copy_name=None,
        status="queued",
        pages_total=0, pages_done=0, items_total=0, vinyl_found=0, other_formats=0, added=0, copies_added=0,
        already_in_collection=0, other_pressings=0, in_other_collections=0, error_message=None, finished_at=None,
        include_wantlist=False, phase="collection", wantlist_items_total=0, wantlist_vinyl_found=0,
        wantlist_other_formats=0, wantlist_added=0, wantlist_already_in_wishlist=0, wantlist_owned=0,
        wantlist_other_pressings_owned=0, wantlist_error=None,
    )


def make_service(pages=None, error=None):
    repository = SimpleNamespace(
        db=SimpleNamespace(commit=AsyncMock(), rollback=AsyncMock(), refresh=AsyncMock(), flush=AsyncMock()),
        masters_in_collection=AsyncMock(return_value=set()),
        import_labels=AsyncMock(return_value=("kent1", "Discogs import (kent)")),
        owned_masters=AsyncMock(return_value=set()),
        delete_empty_collection=AsyncMock(),
    )
    client = SimpleNamespace(get=AsyncMock(side_effect=error, return_value=None))
    if pages is not None:
        client.get = AsyncMock(side_effect=pages)
    return DiscogsImportService(repository, client), client


def page(items, page_number, pages, total):
    return {"pagination": {"page": page_number, "pages": pages, "items": total}, "releases": items}


def wants_page(items, page_number, pages, total):
    return {"pagination": {"page": page_number, "pages": pages, "items": total}, "wants": items}


class TestRunImport:
    async def test_every_page_is_fetched_then_written(self, monkeypatch):
        service, client = make_service(pages=[
            page([item(1), item(2, formats=("CD",))], 1, 2, 3),
            page([item(3)], 2, 2, 3),
        ])
        written = []
        monkeypatch.setattr(service, "_write_batch", AsyncMock(side_effect=lambda job, rs, masters: written.extend(rs)))
        job = make_job()

        await service.run_import(job)

        assert client.get.await_count == 2
        assert job.status == "done" and job.finished_at is not None
        assert (job.pages_done, job.pages_total, job.items_total) == (2, 2, 3)
        assert (job.vinyl_found, job.other_formats) == (2, 1)
        assert [r.external_id for r in written] == ["1", "3"]

    @pytest.mark.parametrize("error, message", [
        (DiscogsAccessDeniedError("403"), "private"),
        (DiscogsUnavailableError("503"), "not answering"),
    ])
    async def test_discogs_errors_fail_the_import_with_a_message(self, error, message):
        service, _ = make_service(error=error)
        job = make_job()

        await service.run_import(job)

        assert job.status == "failed" and message in job.error_message

    async def test_unknown_user_fails_the_import(self):
        service, _ = make_service()  # Discogs answers 404: the client returns None
        job = make_job()

        await service.run_import(job)

        assert job.status == "failed" and "No Discogs user" in job.error_message

    async def test_too_large_collection_is_refused_before_fetching_it_all(self):
        service, client = make_service(pages=[page([item(1)], 1, 200, MAX_ITEMS + 1)])
        job = make_job()

        await service.run_import(job)

        assert job.status == "failed" and "limited" in job.error_message
        assert client.get.await_count == 1

    async def test_unexpected_error_fails_the_import_without_details(self, monkeypatch):
        service, _ = make_service(pages=[page([item(1)], 1, 1, 1)])
        monkeypatch.setattr(service, "_write_batch", AsyncMock(side_effect=RuntimeError("db exploded")))
        job = make_job()

        await service.run_import(job)

        assert job.status == "failed" and "unexpected error" in job.error_message
        assert "exploded" not in job.error_message


class TestLogs:
    async def test_start_and_end_name_the_user_the_discogs_user_and_the_collection(self, monkeypatch):
        service, _ = make_service(pages=[page([item(1)], 1, 1, 1)])
        monkeypatch.setattr(service, "_write_batch", AsyncMock())
        job = make_job()
        job.created_collection = True

        with patch("app.services.discogs_import_service.logger") as logger:
            await service.run_import(job)

        started, done = (call.args[0] for call in logger.info.call_args_list)
        expected = "user 'kent1' imports Discogs user 'kent' into new collection 'Discogs import (kent)' (id 5)"
        assert expected in started and started.endswith("started")
        assert expected in done and ": done, 1 vinyls found" in done

    async def test_a_failure_is_logged_with_its_reason(self):
        service, _ = make_service(error=DiscogsAccessDeniedError("403"))

        with patch("app.services.discogs_import_service.logger") as logger:
            await service.run_import(make_job())

        message = logger.warning.call_args.args[0]
        assert "user 'kent1' imports Discogs user 'kent' into collection" in message
        assert "failed, This Discogs collection is private" in message


class TestCollectionCreatedForTheImport:
    async def test_is_removed_when_the_import_fails(self):
        service, _ = make_service(error=DiscogsAccessDeniedError("403"))
        job = make_job()
        job.created_collection = True

        await service.run_import(job)

        service.repository.delete_empty_collection.assert_awaited_once_with(5)

    async def test_an_existing_collection_is_never_removed(self):
        service, _ = make_service(error=DiscogsAccessDeniedError("403"))

        await service.run_import(make_job())

        service.repository.delete_empty_collection.assert_not_awaited()

    async def test_a_collection_deleted_meanwhile_fails_the_import(self):
        service, client = make_service(pages=[page([item(1)], 1, 1, 1)])
        job = make_job()
        job.collection_id = None

        await service.run_import(job)

        assert job.status == "failed" and "deleted" in job.error_message
        client.get.assert_not_awaited()


async def test_preview_reads_the_collection_and_wantlist_sizes_with_two_small_requests():
    service, client = make_service(pages=[page([item(1)], 1, 1500, 1500), wants_page([item(2)], 1, 12, 12)])

    preview = await service.preview("kent")

    assert (preview.items_total, preview.wantlist_items_total, preview.wantlist_private) == (1500, 12, False)
    assert all("per_page=1&" in call.args[0] for call in client.get.await_args_list)
    assert "/wants?" in client.get.await_args_list[1].args[0]


async def test_a_private_wantlist_does_not_fail_the_preview():
    service, _ = make_service(pages=[page([item(1)], 1, 7, 7), DiscogsAccessDeniedError("403")])

    preview = await service.preview("kent")

    assert (preview.items_total, preview.wantlist_items_total, preview.wantlist_private) == (7, None, True)


async def test_discogs_client_reports_a_refused_resource():
    transport = httpx.MockTransport(lambda request: httpx.Response(403, json={"message": "private"}))
    async with httpx.AsyncClient(transport=transport) as http_client:
        client = DiscogsClient(http_client, max_attempts=1, min_interval=0)
        with pytest.raises(DiscogsAccessDeniedError):
            await client.get("/users/kent/collection/folders/0/releases")


def test_wants_path_reads_the_wantlist_oldest_first():
    path = wants_path("kent", page=3)
    assert path.startswith("/users/kent/wants?") and "per_page=100" in path and "page=3" in path


class TestWantlistPhase:
    async def test_the_wantlist_follows_the_collection_in_the_same_import(self, monkeypatch):
        service, client = make_service(pages=[
            page([item(1)], 1, 1, 1),
            wants_page([item(7), item(8, formats=("CD",))], 1, 1, 2),
        ])
        monkeypatch.setattr(service, "_write_batch", AsyncMock())
        wanted = []
        monkeypatch.setattr(service, "_write_wishlist_batch",
                            AsyncMock(side_effect=lambda job, rs, masters: wanted.extend(rs)))
        job = make_job()
        job.include_wantlist = True

        await service.run_import(job)

        assert job.status == "done" and job.phase == "wantlist"
        assert "/wants?" in client.get.await_args_list[1].args[0]
        assert (job.wantlist_items_total, job.wantlist_vinyl_found, job.wantlist_other_formats) == (2, 1, 1)
        assert [r.external_id for r in wanted] == ["7"]

    async def test_a_private_wantlist_leaves_the_collection_imported(self, monkeypatch):
        service, client = make_service(pages=[page([item(1)], 1, 1, 1), DiscogsAccessDeniedError("403")])
        monkeypatch.setattr(service, "_write_batch", AsyncMock())
        job = make_job()
        job.include_wantlist = True

        await service.run_import(job)

        assert job.status == "done" and job.error_message is None
        assert "wantlist is private" in job.wantlist_error

    async def test_no_wantlist_without_asking(self, monkeypatch):
        service, client = make_service(pages=[page([item(1)], 1, 1, 1)])
        monkeypatch.setattr(service, "_write_batch", AsyncMock())
        job = make_job()

        await service.run_import(job)

        assert client.get.await_count == 1 and job.phase == "collection"
