"""
Real-database tests of the Discogs import (write path). Discogs itself is faked.

Same safety model as test_real_db_relationships.py: real_session runs every test inside an
outer transaction + SAVEPOINT that is rolled back at the end, the commits of the import included.
"""
import random
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from sqlalchemy import func, select

from app.core.exceptions import ValidationError
from app.models.album_model import Album
from app.models.collection_album import CollectionAlbum, CollectionAlbumCopy
from app.models.collection_model import Collection
from app.repositories.discogs_import_repository import DiscogsImportRepository
from app.services.album_enrichment_service import DiscogsAccessDeniedError
from app.services.discogs_import_service import DiscogsImportService

from tests.integration.conftest import make_real_test_user as make_test_user
from tests.integration.test_real_db_relationships import make_test_collection

COVER = "https://i.discogs.com/itest/cover.jpg"


def release_ids(count):
    """Ids far above the real Discogs ones: never an album of the database copy."""
    start = random.randint(3_000_000_000, 3_900_000_000)
    return list(range(start, start + count))


def item(release_id, formats=("Vinyl",), master_id=0):
    return {"id": release_id, "basic_information": {
        "id": release_id, "title": f"Album {release_id}", "year": 1975, "master_id": master_id,
        "artists": [{"name": "Itest Band"}], "genres": ["Rock"], "styles": ["Prog Rock"],
        "labels": [{"name": "Itest Records", "catno": "IT 1"}],
        "formats": [{"name": name, "descriptions": ["LP"]} for name in formats], "cover_image": COVER,
    }}


def discogs_returning(items):
    page = {"pagination": {"page": 1, "pages": 1, "items": len(items)}, "releases": items}
    return SimpleNamespace(get=AsyncMock(return_value=page))


async def run(session, user, collection, items):
    repository = DiscogsImportRepository(session)
    job = await repository.create_import(user.id, collection.id, "itest")
    await DiscogsImportService(repository, discogs_returning(items)).run_import(job)
    return job


async def album(session, release_id):
    return (await session.execute(select(Album).where(Album.external_album_id == str(release_id)))).scalar_one()


class TestDiscogsImport:
    async def test_vinyls_are_added_enriched_with_one_copy_per_instance(self, real_session):
        user = await make_test_user(real_session)
        collection = await make_test_collection(real_session, owner_id=user.id)
        first, second, cd = release_ids(3)

        job = await run(real_session, user, collection, [item(first), item(second), item(first), item(cd, ("CD",))])

        assert job.status == "done", job.error_message
        assert (job.vinyl_found, job.other_formats, job.added, job.copies_added) == (2, 1, 2, 3)

        imported = await album(real_session, first)
        assert imported.title == "Itest Band - Album %d" % first
        assert imported.image_url == COVER and imported.styles == ["Prog Rock"]
        assert imported.enriched_at is not None and imported.enrichment_status == "ok"
        assert imported.country is None

        row = (await real_session.execute(select(CollectionAlbum).where(
            CollectionAlbum.collection_id == collection.id, CollectionAlbum.album_id == imported.id))).scalar_one()
        # The owner confirms the pressing in Vinyl Keeper
        assert row.pressing_confirmed is False
        copies = (await real_session.execute(select(CollectionAlbumCopy).where(
            CollectionAlbumCopy.collection_id == collection.id,
            CollectionAlbumCopy.album_id == imported.id))).scalars().all()
        assert len(copies) == 2

    async def test_importing_again_adds_nothing_twice(self, real_session):
        user = await make_test_user(real_session)
        collection = await make_test_collection(real_session, owner_id=user.id)
        items = [item(release_id) for release_id in release_ids(2)]

        await run(real_session, user, collection, items)
        again = await run(real_session, user, collection, items)

        assert again.status == "done"
        assert (again.added, again.already_in_collection) == (0, 2)

    async def test_album_waiting_for_enrichment_is_filled_and_an_enriched_one_left_as_is(self, real_session):
        user = await make_test_user(real_session)
        collection = await make_test_collection(real_session, owner_id=user.id)
        pending_id, enriched_id = release_ids(2)
        repository = DiscogsImportRepository(real_session)
        source_id = await repository.discogs_source_id()
        real_session.add_all([
            Album(external_album_id=str(pending_id), external_source_id=source_id, title="Typed by a user"),
            Album(external_album_id=str(enriched_id), external_source_id=source_id, title="Curated title"),
        ])
        await real_session.flush()
        curated = await album(real_session, enriched_id)
        curated.enriched_at = curated.created_at
        curated.enrichment_status = "ok"
        await real_session.flush()

        job = await run(real_session, user, collection, [item(pending_id), item(enriched_id)])

        assert job.status == "done" and job.added == 2
        filled = await album(real_session, pending_id)
        await real_session.refresh(filled)
        assert filled.title == "Itest Band - Album %d" % pending_id and filled.enriched_at is not None
        kept = await album(real_session, enriched_id)
        await real_session.refresh(kept)
        assert kept.title == "Curated title"

    async def test_records_go_only_into_a_collection_of_the_user(self, real_session):
        owner = await make_test_user(real_session)
        other = await make_test_user(real_session)
        collection = await make_test_collection(real_session, owner_id=owner.id)

        with pytest.raises(ValidationError, match="one of your collections"):
            await DiscogsImportService(DiscogsImportRepository(real_session)).create_import(
                other.id, collection.id, "itest")

    async def test_one_import_at_a_time_per_user(self, real_session):
        user = await make_test_user(real_session)
        collection = await make_test_collection(real_session, owner_id=user.id)
        service = DiscogsImportService(DiscogsImportRepository(real_session))
        await service.create_import(user.id, collection.id, "itest")

        with pytest.raises(ValidationError, match="already in progress"):
            await service.create_import(user.id, collection.id, "itest")


class TestNewCollection:
    async def test_a_new_private_collection_receives_the_records(self, real_session):
        user = await make_test_user(real_session)
        service = DiscogsImportService(DiscogsImportRepository(real_session))

        job = await service.create_import(user.id, None, "kent")
        collection = (await real_session.execute(
            select(Collection).where(Collection.id == job.collection_id))).scalar_one()

        assert job.created_collection is True
        assert collection.name == "Discogs import (kent)" and collection.owner_id == user.id
        assert collection.is_public is False

    async def test_its_name_never_collides_with_one_of_the_user(self, real_session):
        user = await make_test_user(real_session)
        repository = DiscogsImportRepository(real_session)
        await repository.create_collection(user.id, "Discogs import (kent)", "")

        second = await repository.create_collection(user.id, "Discogs import (kent)", "")
        third = await repository.create_collection(user.id, "Discogs import (kent)", "")

        assert (second.name, third.name) == ("Discogs import (kent) 2", "Discogs import (kent) 3")

    async def test_it_is_removed_when_the_import_fails_empty(self, real_session):
        user = await make_test_user(real_session)
        repository = DiscogsImportRepository(real_session)
        job = await DiscogsImportService(repository).create_import(user.id, None, "kent")
        collection_id = job.collection_id
        private = SimpleNamespace(get=AsyncMock(side_effect=DiscogsAccessDeniedError("403")))

        await DiscogsImportService(repository, private).run_import(job)

        assert job.status == "failed" and "private" in job.error_message
        assert job.collection_id is None
        remaining = (await real_session.execute(
            select(func.count()).select_from(Collection).where(Collection.id == collection_id))).scalar()
        assert remaining == 0


class TestReportedDuplicates:
    async def test_other_pressings_and_records_of_other_collections_are_counted(self, real_session):
        user = await make_test_user(real_session)
        target = await make_test_collection(real_session, owner_id=user.id)
        other = await make_test_collection(real_session, owner_id=user.id)
        owned_pressing, new_pressing, elsewhere = release_ids(3)
        master = owned_pressing  # any id: the two pressings share it

        await run(real_session, user, target, [item(owned_pressing, master_id=master)])
        await run(real_session, user, other, [item(elsewhere)])
        job = await run(real_session, user, target, [item(new_pressing, master_id=master), item(elsewhere)])

        assert job.status == "done", job.error_message
        assert (job.added, job.other_pressings, job.in_other_collections) == (2, 1, 1)


class TestWantlist:
    async def test_vinyls_go_to_the_wishlist_by_pressing(self, real_session):
        from app.models.wishlist_model import Wishlist

        user = await make_test_user(real_session)
        collection = await make_test_collection(real_session, owner_id=user.id)
        owned, other_pressing, new_one, listed, cd = release_ids(5)
        master = owned
        repository = DiscogsImportRepository(real_session)
        # Owned before: this pressing is in a collection
        await run(real_session, user, collection, [item(owned, master_id=master)])
        # Already in the wishlist
        real_session.add(Wishlist(user_id=user.id, external_id=str(listed), title="Listed",
                                  entity_type_id=await repository.album_entity_type_id(),
                                  external_source_id=await repository.discogs_source_id()))
        await real_session.flush()

        wants = [item(owned, master_id=master), item(other_pressing, master_id=master), item(new_one),
                 item(listed), item(cd, ("CD",))]
        pages = [
            {"pagination": {"page": 1, "pages": 1, "items": 0}, "releases": []},
            {"pagination": {"page": 1, "pages": 1, "items": len(wants)}, "wants": wants},
        ]
        job = await repository.create_import(user.id, collection.id, "itest", include_wantlist=True)
        await DiscogsImportService(repository, SimpleNamespace(get=AsyncMock(side_effect=pages))).run_import(job)

        assert job.status == "done" and job.wantlist_error is None, job.wantlist_error
        assert (job.wantlist_vinyl_found, job.wantlist_other_formats) == (4, 1)
        # This very pressing owned: left out. Another pressing of an owned record: added and counted
        assert (job.wantlist_owned, job.wantlist_added, job.wantlist_other_pressings_owned,
                job.wantlist_already_in_wishlist) == (1, 2, 1, 1)

        rows = (await real_session.execute(select(Wishlist.external_id, Wishlist.title, Wishlist.image_url)
                                           .where(Wishlist.user_id == user.id))).all()
        by_id = {external_id: (title, image) for external_id, title, image in rows}
        assert set(by_id) == {str(other_pressing), str(new_one), str(listed)}
        assert by_id[str(new_one)] == (f"Itest Band - Album {new_one}", COVER)
