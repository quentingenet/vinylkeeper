"""
Real-database tests of the saved copy of a collection ("SAVE <name> (<date>)"), on its own and
before a Discogs import into an existing collection.

Same safety model as test_real_db_relationships.py: everything is rolled back at the end.
"""
from datetime import date

import pytest
from sqlalchemy import select

from app.core.exceptions import ForbiddenError, ValidationError
from app.models.artist_model import Artist
from app.models.association_tables import CollectionArtist
from app.models.collection_album import CollectionAlbum, CollectionAlbumCopy
from app.models.collection_model import Collection
from app.repositories.collection_album_repository import CollectionAlbumRepository
from app.repositories.discogs_import_repository import DiscogsImportRepository
from app.services.discogs_import_service import DiscogsImportService

from tests.integration.test_collection_copies_real_db import existing_albums
from tests.integration.test_discogs_import_real_db import discogs_returning, item, release_ids
from tests.integration.test_real_db_relationships import (
    make_collection_service,
    make_test_collection,
    make_test_user,
    put_album_in_collection,
)


async def filled_collection(session):
    """Two records, one owned twice with its conditions, one pressing confirmed, and an artist."""
    user = await make_test_user(session)
    collection = await make_test_collection(session, owner_id=user.id)
    first, second = await existing_albums(session, 2)
    await put_album_in_collection(session, collection.id, first.id, state_record="near_mint", state_cover="good")
    await CollectionAlbumRepository(session).add_or_update(
        collection.id, first.id, {"state_record": "poor", "acquisition_month_year": "2019-05"}, add_copy=True)
    await CollectionAlbumRepository(session).add_or_update(collection.id, second.id, {}, pressing_confirmed=True)
    artist_id = (await session.execute(select(Artist.id).limit(1))).scalar_one()
    session.add(CollectionArtist(collection_id=collection.id, artist_id=artist_id))
    await session.flush()
    return user, collection


async def contents(session, collection_id):
    """What a saved copy must reproduce, without the collection id."""
    albums = (await session.execute(
        select(CollectionAlbum.album_id, CollectionAlbum.pressing_confirmed)
        .where(CollectionAlbum.collection_id == collection_id).order_by(CollectionAlbum.album_id))).all()
    copies = (await session.execute(
        select(CollectionAlbumCopy.album_id, CollectionAlbumCopy.state_record, CollectionAlbumCopy.state_cover,
               CollectionAlbumCopy.acquisition_month_year)
        .where(CollectionAlbumCopy.collection_id == collection_id)
        .order_by(CollectionAlbumCopy.album_id, CollectionAlbumCopy.id))).all()
    artists = (await session.execute(
        select(CollectionArtist.artist_id).where(CollectionArtist.collection_id == collection_id))).scalars().all()
    return [tuple(row) for row in albums], [tuple(row) for row in copies], sorted(artists)


class TestSaveCopy:
    async def test_the_copy_holds_every_record_copy_condition_and_artist(self, real_session):
        user, collection = await filled_collection(real_session)
        before = await contents(real_session, collection.id)

        copy = await make_collection_service(real_session).save_copy(user.id, collection.id)

        assert copy.name == f"SAVE {collection.name} ({date.today().isoformat()})"
        assert copy.is_public is False and copy.owner_id == user.id
        assert await contents(real_session, copy.id) == before
        assert len(before[1]) == 3  # two copies of the first record, one of the second
        # The original is untouched
        assert await contents(real_session, collection.id) == before

    async def test_a_collection_has_one_save_and_a_second_one_is_explained(self, real_session):
        user, collection = await filled_collection(real_session)
        service = make_collection_service(real_session)
        first = await service.save_copy(user.id, collection.id)
        # Read before: the refused save rolls back, which expires the loaded rows
        first_id, first_name = first.id, first.name

        with pytest.raises(ValidationError) as refused:
            await service.save_copy(user.id, collection.id)

        assert refused.value.detail["message"] == (
            f"This collection is already saved as “{first_name}”: delete that save to make a new one")
        assert refused.value.detail["details"]["save_collection_id"] == first_id

    async def test_a_save_is_not_saved_again(self, real_session):
        user, collection = await filled_collection(real_session)
        service = make_collection_service(real_session)
        save = await service.save_copy(user.id, collection.id)

        with pytest.raises(ValidationError, match="already a save"):
            await service.save_copy(user.id, save.id)

    async def test_once_the_save_is_deleted_a_new_one_can_be_made(self, real_session):
        user, collection = await filled_collection(real_session)
        service = make_collection_service(real_session)
        first = await service.save_copy(user.id, collection.id)
        await service.delete_collection(user.id, first.id)

        second = await service.save_copy(user.id, collection.id)

        assert second.saved_from_collection_id == collection.id

    async def test_the_list_tells_which_collections_are_saved(self, real_session):
        user, collection = await filled_collection(real_session)
        service = make_collection_service(real_session)
        save = await service.save_copy(user.id, collection.id)

        items, _ = await service.get_user_collections(user.id, page=1, limit=10)
        by_id = {item.id: item for item in items}

        assert (by_id[collection.id].save_collection_id, by_id[collection.id].save_collection_name) == (
            save.id, save.name)
        assert by_id[save.id].saved_from_collection_id == collection.id

    async def test_only_the_owner_saves_a_copy(self, real_session):
        _, collection = await filled_collection(real_session)
        stranger = await make_test_user(real_session)

        with pytest.raises(ForbiddenError):
            await make_collection_service(real_session).save_copy(stranger.id, collection.id)


class TestSaveCopyBeforeImport:
    async def test_the_copy_keeps_the_collection_as_it_was_before_the_import(self, real_session):
        user, collection = await filled_collection(real_session)
        before = await contents(real_session, collection.id)
        repository = DiscogsImportRepository(real_session)

        job = await DiscogsImportService(repository).create_import(user.id, collection.id, "itest", save_copy=True)
        [new_release] = release_ids(1)
        await DiscogsImportService(repository, discogs_returning([item(new_release)])).run_import(job)

        assert job.status == "done" and job.added == 1
        assert job.saved_copy_name == f"SAVE {collection.name} ({date.today().isoformat()})"
        assert await contents(real_session, job.saved_copy_collection_id) == before
        assert len((await contents(real_session, collection.id))[0]) == len(before[0]) + 1

    async def test_an_existing_save_is_kept_as_the_copy_of_the_import(self, real_session):
        user, collection = await filled_collection(real_session)
        save = await make_collection_service(real_session).save_copy(user.id, collection.id)

        job = await DiscogsImportService(DiscogsImportRepository(real_session)).create_import(
            user.id, collection.id, "itest", save_copy=True)

        assert (job.saved_copy_collection_id, job.saved_copy_name) == (save.id, save.name)
        saves = (await real_session.execute(
            select(Collection.id).where(Collection.saved_from_collection_id == collection.id))).scalars().all()
        assert saves == [save.id]

    async def test_no_copy_without_asking_nor_for_a_new_collection(self, real_session):
        user, collection = await filled_collection(real_session)
        service = DiscogsImportService(DiscogsImportRepository(real_session))

        into_existing = await service.create_import(user.id, collection.id, "itest")
        into_existing.status = "done"
        await real_session.flush()
        into_new = await service.create_import(user.id, None, "itest", save_copy=True)

        assert into_existing.saved_copy_collection_id is None
        assert into_new.saved_copy_collection_id is None
        names = (await real_session.execute(
            select(Collection.name).where(Collection.owner_id == user.id))).scalars().all()
        assert not any(name.startswith("SAVE ") for name in names)

