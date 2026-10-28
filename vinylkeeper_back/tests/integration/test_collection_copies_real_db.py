"""
Real-database tests of the condition of records in collections (state of the record,
of the cover, acquisition date) across every read and write path. Written before the
move of these fields to collection_album_copies: the contract must not change for
clients that know nothing about copies (the deployed mobile app).
"""
import csv
import io
import uuid

import pytest
from pydantic import ValidationError as PydanticValidationError
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError, ResourceNotFoundError, ValidationError
from app.models.album_model import Album
from app.models.collection_album import CollectionAlbumCopy
from app.repositories.collection_album_repository import CollectionAlbumRepository
from app.repositories.collection_repository import CollectionRepository
from app.schemas.collection_album_schema import (
    CollectionAlbumCopyData, CollectionAlbumCreate, CollectionAlbumUpdate,
)
from app.schemas.external_reference_schema import (
    AddToCollectionRequest, AlbumStateData, ReplacePressingRequest,
)
from app.schemas.collection_schema import CollectionCreate, CollectionUpdate
from app.services.export_service import ExportService
from tests.integration.test_real_db_relationships import (
    make_collection_service,
    make_external_reference_service,
    make_test_collection,
    make_test_user,
)


async def existing_albums(session: AsyncSession, count: int) -> list[Album]:
    return list((await session.execute(select(Album).order_by(Album.id).limit(count))).scalars().all())


async def owned_collection_with_album(session: AsyncSession, **states):
    user = await make_test_user(session)
    collection = await make_test_collection(session, owner_id=user.id)
    [album] = await existing_albums(session, 1)
    await make_collection_service(session).add_album_to_collection(
        user.id, collection.id, CollectionAlbumCreate(album_id=album.id, collection_id=collection.id, **states))
    # Reads below start from a clean session, like a new request does
    session.expunge_all()
    return user, collection, album


async def copies_of(service, user, collection) -> list:
    """Copies of the only album of the collection."""
    page = await service.get_collection_albums_paginated(collection.id, user.id, 1, 12, "newest")
    return page.items[0].copies


def states(response) -> tuple:
    return (
        response.state_record.value if response.state_record else None,
        response.state_cover.value if response.state_cover else None,
        response.acquisition_month_year,
    )


class TestWriteThroughCollectionRoutes:
    async def test_add_stores_the_states(self, real_session):
        user = await make_test_user(real_session)
        collection = await make_test_collection(real_session, owner_id=user.id)
        [album] = await existing_albums(real_session, 1)

        response = await make_collection_service(real_session).add_album_to_collection(
            user.id, collection.id,
            CollectionAlbumCreate(album_id=album.id, collection_id=collection.id, state_record="mint",
                                  state_cover="very_good", acquisition_month_year="2023-02"))

        assert states(response) == ("mint", "very_good", "2023-02")

    async def test_partial_update_keeps_the_other_fields(self, real_session):
        user, collection, album = await owned_collection_with_album(
            real_session, state_record="mint", state_cover="good")

        response = await make_collection_service(real_session).update_album_metadata(
            user.id, collection.id, album.id, CollectionAlbumUpdate(acquisition_month_year="2024-06"))

        assert states(response) == ("mint", "good", "2024-06")

    async def test_update_to_null_clears_a_state(self, real_session):
        """The album modal always sends the three fields."""
        user, collection, album = await owned_collection_with_album(real_session, state_record="mint")

        response = await make_collection_service(real_session).update_album_metadata(
            user.id, collection.id, album.id,
            CollectionAlbumUpdate(state_record=None, state_cover="good", acquisition_month_year=None))

        assert states(response) == (None, "good", None)


class TestReadPaths:
    async def test_paginated_albums(self, real_session):
        user, collection, _ = await owned_collection_with_album(
            real_session, state_record="near_mint", acquisition_month_year="2020-01")

        page = await make_collection_service(real_session).get_collection_albums_paginated(
            collection.id, user.id, 1, 12, "newest")

        assert [states(item) for item in page.items] == [("near_mint", None, "2020-01")]

    async def test_collection_detail(self, real_session):
        user, collection, _ = await owned_collection_with_album(real_session, state_cover="fair")

        response = await make_collection_service(real_session).get_collection_by_id(collection.id, user.id)

        assert [states(item) for item in response.albums] == [(None, "fair", None)]

    async def test_search_in_collection(self, real_session):
        user, collection, album = await owned_collection_with_album(real_session, state_record="poor")

        response = await make_collection_service(real_session).search_collection_items(
            collection.id, user.id, album.title[:3], "album")

        assert (None if not response.albums else states(response.albums[0])) == ("poor", None, None)

    async def test_csv_export(self, real_session):
        user, collection, _ = await owned_collection_with_album(
            real_session, state_record="mint", state_cover="good", acquisition_month_year="2022-11")
        service = ExportService(CollectionRepository(real_session), CollectionAlbumRepository(real_session))

        response = await service.export_collection_albums_csv(collection.id, user.id)
        body = "".join([chunk if isinstance(chunk, str) else chunk.decode() async for chunk in response.body_iterator])

        [row] = list(csv.DictReader(io.StringIO(body.lstrip("\ufeff")), delimiter=";"))
        assert (row["state_record"], row["state_cover"], row["acquisition_month_year"]) == ("mint", "good", "2022-11")


class TestAddFromSearch:
    """POST /external-references/collection/{id}/add, as sent by clients that know nothing about copies."""

    @staticmethod
    def request(album: Album, **album_states) -> AddToCollectionRequest:
        return AddToCollectionRequest(
            external_id=album.external_album_id, entity_type="album", title=album.title or "itest",
            image_url="", source="discogs", album_data=AlbumStateData(**album_states))

    async def test_new_album_gets_the_states(self, real_session):
        user = await make_test_user(real_session)
        collection = await make_test_collection(real_session, owner_id=user.id)
        [album] = await existing_albums(real_session, 1)

        response = await make_external_reference_service(real_session).add_to_collection(
            user.id, collection.id, self.request(album, state_record="mint", acquisition_month_year="2021-03"))

        page = await make_collection_service(real_session).get_collection_albums_paginated(
            collection.id, user.id, 1, 12, "newest")
        assert response.is_new is True
        assert [states(item) for item in page.items] == [("mint", None, "2021-03")]

    async def test_same_release_again_updates_the_given_states_only(self, real_session):
        user = await make_test_user(real_session)
        collection = await make_test_collection(real_session, owner_id=user.id)
        [album] = await existing_albums(real_session, 1)
        service = make_external_reference_service(real_session)
        await service.add_to_collection(
            user.id, collection.id, self.request(album, state_record="mint", state_cover="good"))

        response = await service.add_to_collection(user.id, collection.id, self.request(album, state_record="fair"))

        page = await make_collection_service(real_session).get_collection_albums_paginated(
            collection.id, user.id, 1, 12, "newest")
        assert response.is_new is False
        assert [states(item) for item in page.items] == [("fair", "good", None)]


class TestCollectionCreatedWithAlbums:
    async def test_albums_start_without_states(self, real_session):
        user = await make_test_user(real_session)
        collection = await make_test_collection(real_session, owner_id=user.id)
        albums = await existing_albums(real_session, 2)

        await CollectionRepository(real_session).add_albums(collection, [a.id for a in albums])

        page = await make_collection_service(real_session).get_collection_albums_paginated(
            collection.id, user.id, 1, 12, "newest")
        assert sorted(item.id for item in page.items) == sorted(a.id for a in albums)
        assert {states(item) for item in page.items} == {(None, None, None)}


class TestCopies:
    async def test_add_a_copy_keeps_the_first_one_as_the_album_state(self, real_session):
        user, collection, album = await owned_collection_with_album(real_session, state_record="mint")

        response = await make_collection_service(real_session).add_album_copy(
            user.id, collection.id, album.id, CollectionAlbumCopyData(state_record="fair", state_cover="good"))

        assert response.copies_count == 2
        assert [states(copy) for copy in response.copies] == [("mint", None, None), ("fair", "good", None)]
        assert states(response) == ("mint", None, None)

    async def test_old_metadata_route_edits_the_first_copy_only(self, real_session):
        user, collection, album = await owned_collection_with_album(real_session, state_record="mint")
        service = make_collection_service(real_session)
        await service.add_album_copy(user.id, collection.id, album.id, CollectionAlbumCopyData(state_record="fair"))

        response = await service.update_album_metadata(
            user.id, collection.id, album.id, CollectionAlbumUpdate(state_record="poor"))

        assert [states(copy) for copy in response.copies] == [("poor", None, None), ("fair", None, None)]

    async def test_old_add_route_updates_the_first_copy_only(self, real_session):
        user, collection, album = await owned_collection_with_album(real_session, state_record="mint")
        await make_collection_service(real_session).add_album_copy(
            user.id, collection.id, album.id, CollectionAlbumCopyData(state_record="fair"))

        await make_external_reference_service(real_session).add_to_collection(
            user.id, collection.id, TestAddFromSearch.request(album, state_cover="good"))

        page = await make_collection_service(real_session).get_collection_albums_paginated(
            collection.id, user.id, 1, 12, "newest")
        assert [states(copy) for copy in page.items[0].copies] == [("mint", "good", None), ("fair", None, None)]

    async def test_update_a_copy_changes_only_the_fields_sent(self, real_session):
        user, collection, album = await owned_collection_with_album(
            real_session, state_record="mint", acquisition_month_year="2020-01")
        service = make_collection_service(real_session)
        [first] = await copies_of(service, user, collection)

        response = await service.update_album_copy(
            user.id, collection.id, album.id, first.id, CollectionAlbumCopyData(state_cover="good"))

        assert states(response.copies[0]) == ("mint", "good", "2020-01")

    async def test_update_can_clear_every_field(self, real_session):
        user, collection, album = await owned_collection_with_album(real_session, state_record="mint")
        service = make_collection_service(real_session)
        [first] = await copies_of(service, user, collection)

        response = await service.update_album_copy(
            user.id, collection.id, album.id, first.id, CollectionAlbumCopyData(state_record=None))

        assert states(response.copies[0]) == (None, None, None)

    async def test_delete_a_copy(self, real_session):
        user, collection, album = await owned_collection_with_album(real_session, state_record="mint")
        service = make_collection_service(real_session)
        added = await service.add_album_copy(user.id, collection.id, album.id, CollectionAlbumCopyData())

        response = await service.delete_album_copy(user.id, collection.id, album.id, added.copies[0].id)

        assert response.copies_count == 1
        assert states(response) == (None, None, None)  # the remaining copy is now the first one

    async def test_the_last_copy_cannot_be_deleted(self, real_session):
        user, collection, album = await owned_collection_with_album(real_session)
        service = make_collection_service(real_session)
        [only] = await copies_of(service, user, collection)

        with pytest.raises(ValidationError):
            await service.delete_album_copy(user.id, collection.id, album.id, only.id)

    async def test_a_copy_of_another_album_is_not_found(self, real_session):
        user = await make_test_user(real_session)
        collection = await make_test_collection(real_session, owner_id=user.id)
        first_album, second_album = await existing_albums(real_session, 2)
        service = make_collection_service(real_session)
        for album in (first_album, second_album):
            await service.add_album_to_collection(
                user.id, collection.id, CollectionAlbumCreate(album_id=album.id, collection_id=collection.id))
        other = await service.add_album_copy(user.id, collection.id, second_album.id, CollectionAlbumCopyData())

        with pytest.raises(ResourceNotFoundError):
            await service.update_album_copy(
                user.id, collection.id, first_album.id, other.copies[1].id, CollectionAlbumCopyData())

    async def test_only_the_owner_manages_copies(self, real_session):
        _, collection, album = await owned_collection_with_album(real_session)
        stranger = await make_test_user(real_session)

        with pytest.raises(ForbiddenError):
            await make_collection_service(real_session).add_album_copy(
                stranger.id, collection.id, album.id, CollectionAlbumCopyData())

    async def test_removing_the_album_removes_its_copies(self, real_session):
        user, collection, album = await owned_collection_with_album(real_session)
        service = make_collection_service(real_session)
        await service.add_album_copy(user.id, collection.id, album.id, CollectionAlbumCopyData())

        await service.remove_album_from_collection(user.id, collection.id, album.id)

        remaining = (await real_session.execute(
            select(func.count()).select_from(CollectionAlbumCopy)
            .filter(CollectionAlbumCopy.collection_id == collection.id))).scalar_one()
        assert remaining == 0

    async def test_an_album_with_two_copies_is_still_one_album(self, real_session):
        user, collection, album = await owned_collection_with_album(real_session)
        service = make_collection_service(real_session)
        await service.add_album_copy(user.id, collection.id, album.id, CollectionAlbumCopyData())
        real_session.expunge_all()

        page = await service.get_collection_albums_paginated(collection.id, user.id, 1, 12, "newest")
        detail = await service.get_collection_by_id(collection.id, user.id)

        assert (page.total, len(page.items), len(detail.albums)) == (1, 1, 1)
        assert detail.albums[0].copies_count == 2


class TestCollectionLevelResponses:
    """Responses that list every album of a collection, built from the collection itself."""

    async def test_create_collection_with_albums(self, real_session):
        user = await make_test_user(real_session)
        albums = await existing_albums(real_session, 2)

        response = await make_collection_service(real_session).create_collection(
            CollectionCreate(name=f"itest {user.id}", is_public=False, album_ids=[a.id for a in albums]), user.id)

        assert sorted(a.id for a in response.albums) == sorted(a.id for a in albums)
        assert {a.copies_count for a in response.albums} == {1}

    async def test_update_collection(self, real_session):
        user, collection, album = await owned_collection_with_album(real_session, state_record="good")
        service = make_collection_service(real_session)
        await service.add_album_copy(user.id, collection.id, album.id, CollectionAlbumCopyData())

        response = await service.update_collection(user.id, collection.id, CollectionUpdate(description="itest"))

        assert [(a.copies_count, states(a)) for a in response.albums] == [(2, ("good", None, None))]


class TestPressingConfirmation:
    async def test_added_by_a_client_unaware_of_pressings_is_unconfirmed(self, real_session):
        user = await make_test_user(real_session)
        collection = await make_test_collection(real_session, owner_id=user.id)
        [album] = await existing_albums(real_session, 1)

        await make_external_reference_service(real_session).add_to_collection(
            user.id, collection.id, TestAddFromSearch.request(album))

        [item] = (await make_collection_service(real_session).get_collection_albums_paginated(
            collection.id, user.id, 1, 12, "newest")).items
        assert item.pressing_confirmed is False

    async def test_picked_with_its_pressing_in_sight_is_confirmed(self, real_session):
        user = await make_test_user(real_session)
        collection = await make_test_collection(real_session, owner_id=user.id)
        [album] = await existing_albums(real_session, 1)
        request = TestAddFromSearch.request(album).model_copy(update={"pressing_confirmed": True})

        await make_external_reference_service(real_session).add_to_collection(user.id, collection.id, request)

        [item] = (await make_collection_service(real_session).get_collection_albums_paginated(
            collection.id, user.id, 1, 12, "newest")).items
        assert item.pressing_confirmed is True

    async def test_picking_the_same_release_again_confirms_it_but_an_old_client_never_unconfirms(
            self, real_session):
        user = await make_test_user(real_session)
        collection = await make_test_collection(real_session, owner_id=user.id)
        [album] = await existing_albums(real_session, 1)
        service = make_external_reference_service(real_session)
        await service.add_to_collection(user.id, collection.id, TestAddFromSearch.request(album))

        await service.add_to_collection(user.id, collection.id, TestAddFromSearch.request(album).model_copy(
            update={"pressing_confirmed": True}))
        await service.add_to_collection(user.id, collection.id, TestAddFromSearch.request(album))

        [item] = (await make_collection_service(real_session).get_collection_albums_paginated(
            collection.id, user.id, 1, 12, "newest")).items
        assert item.pressing_confirmed is True

    async def test_owner_confirms_the_pressing(self, real_session):
        user, collection, album = await owned_collection_with_album(real_session)

        response = await make_collection_service(real_session).confirm_album_pressing(user.id, collection.id, album.id)

        assert response.pressing_confirmed is True

    async def test_only_the_owner_confirms(self, real_session):
        _, collection, album = await owned_collection_with_album(real_session)
        stranger = await make_test_user(real_session)

        with pytest.raises(ForbiddenError):
            await make_collection_service(real_session).confirm_album_pressing(stranger.id, collection.id, album.id)

    async def test_response_carries_the_pressing_of_the_release(self, real_session):
        user, collection, album = await owned_collection_with_album(real_session)

        [item] = (await make_collection_service(real_session).get_collection_albums_paginated(
            collection.id, user.id, 1, 12, "newest")).items

        assert (item.release_year, item.country, item.label, item.catno, item.formats) == (
            album.release_year, album.country, album.label, album.catno, album.formats or [])


def replace_request(external_id: str, title: str = "itest pressing") -> ReplacePressingRequest:
    return ReplacePressingRequest(external_id=external_id, entity_type="album", title=title,
                                  image_url="", source="discogs")


class TestReplacePressing:
    async def test_copies_condition_and_date_added_move_to_the_right_pressing(self, real_session):
        user, collection, album = await owned_collection_with_album(
            real_session, state_record="mint", acquisition_month_year="2019-05")
        await make_collection_service(real_session).add_album_copy(
            user.id, collection.id, album.id, CollectionAlbumCopyData(state_record="fair"))
        [before] = (await make_collection_service(real_session).get_collection_albums_paginated(
            collection.id, user.id, 1, 12, "newest")).items
        new_external_id = str(uuid.uuid4().int)[:12]

        response = await make_external_reference_service(real_session).replace_pressing(
            user.id, collection.id, album.id, replace_request(new_external_id))

        page = await make_collection_service(real_session).get_collection_albums_paginated(
            collection.id, user.id, 1, 12, "newest")
        [after] = page.items
        assert response.id == after.id != album.id
        assert response.external_album_id == new_external_id
        assert [states(c) for c in after.copies] == [("mint", None, "2019-05"), ("fair", None, None)]
        assert after.created_at == before.created_at
        assert after.pressing_confirmed is True

    async def test_copies_are_gathered_when_the_pressing_is_already_in_the_collection(self, real_session):
        user = await make_test_user(real_session)
        collection = await make_test_collection(real_session, owner_id=user.id)
        wrong, right = await existing_albums(real_session, 2)
        service = make_collection_service(real_session)
        await service.add_album_to_collection(user.id, collection.id, CollectionAlbumCreate(
            album_id=right.id, collection_id=collection.id, state_record="good"))
        await service.add_album_to_collection(user.id, collection.id, CollectionAlbumCreate(
            album_id=wrong.id, collection_id=collection.id, state_record="mint"))
        real_session.expunge_all()

        response = await make_external_reference_service(real_session).replace_pressing(
            user.id, collection.id, wrong.id, replace_request(right.external_album_id))

        page = await service.get_collection_albums_paginated(collection.id, user.id, 1, 12, "newest")
        assert [item.id for item in page.items] == [right.id]
        assert [states(c) for c in response.copies] == [("good", None, None), ("mint", None, None)]

    async def test_same_release_only_confirms_it(self, real_session):
        user, collection, album = await owned_collection_with_album(real_session, state_record="mint")

        response = await make_external_reference_service(real_session).replace_pressing(
            user.id, collection.id, album.id, replace_request(album.external_album_id))

        assert (response.id, response.pressing_confirmed, states(response)) == (album.id, True, ("mint", None, None))

    async def test_only_the_owner_replaces(self, real_session):
        _, collection, album = await owned_collection_with_album(real_session)
        stranger = await make_test_user(real_session)

        with pytest.raises(ForbiddenError):
            await make_external_reference_service(real_session).replace_pressing(
                stranger.id, collection.id, album.id, replace_request("123"))

    async def test_album_not_in_the_collection(self, real_session):
        user = await make_test_user(real_session)
        collection = await make_test_collection(real_session, owner_id=user.id)
        [album] = await existing_albums(real_session, 1)

        with pytest.raises(ResourceNotFoundError):
            await make_external_reference_service(real_session).replace_pressing(
                user.id, collection.id, album.id, replace_request(album.external_album_id))

    def test_only_albums_have_a_pressing(self):
        with pytest.raises(PydanticValidationError):
            ReplacePressingRequest(external_id="1", entity_type="artist", title="x", image_url="", source="discogs")


class TestAddAnotherCopy:
    async def test_add_copy_keeps_the_first_copy_and_adds_one(self, real_session):
        user = await make_test_user(real_session)
        collection = await make_test_collection(real_session, owner_id=user.id)
        [album] = await existing_albums(real_session, 1)
        service = make_external_reference_service(real_session)
        await service.add_to_collection(user.id, collection.id, TestAddFromSearch.request(album, state_record="mint"))

        response = await service.add_to_collection(user.id, collection.id, TestAddFromSearch.request(
            album, state_record="fair").model_copy(update={"add_copy": True}))

        [item] = (await make_collection_service(real_session).get_collection_albums_paginated(
            collection.id, user.id, 1, 12, "newest")).items
        assert [states(c) for c in item.copies] == [("mint", None, None), ("fair", None, None)]
        assert response.is_new is True
        assert response.message.startswith("Added another copy")

    async def test_add_copy_of_a_new_album_is_a_plain_add(self, real_session):
        user = await make_test_user(real_session)
        collection = await make_test_collection(real_session, owner_id=user.id)
        [album] = await existing_albums(real_session, 1)

        response = await make_external_reference_service(real_session).add_to_collection(
            user.id, collection.id, TestAddFromSearch.request(album).model_copy(update={"add_copy": True}))

        [item] = (await make_collection_service(real_session).get_collection_albums_paginated(
            collection.id, user.id, 1, 12, "newest")).items
        assert (response.is_new, item.copies_count) == (True, 1)


class TestOwnedPressings:
    async def test_same_release_and_other_pressings_of_the_work(self, real_session):
        user = await make_test_user(real_session)
        collection = await make_test_collection(real_session, owner_id=user.id)
        original, reissue, other_work = await existing_albums(real_session, 3)
        master = f"itest-{uuid.uuid4().hex[:8]}"
        original.external_master_id = master
        reissue.external_master_id = master
        service = make_collection_service(real_session)
        for album in (original, reissue, other_work):
            await service.add_album_to_collection(
                user.id, collection.id, CollectionAlbumCreate(album_id=album.id, collection_id=collection.id))
        await service.add_album_copy(user.id, collection.id, original.id, CollectionAlbumCopyData())

        owned = await make_external_reference_service(real_session).find_owned_pressings(
            user.id, original.external_album_id, master)

        assert {(o.album_id, o.same_release, o.copies_count) for o in owned} == {
            (original.id, True, 2), (reissue.id, False, 1)}
        assert {o.collection_name for o in owned} == {collection.name}

    async def test_without_master_only_the_release_is_found(self, real_session):
        user, collection, album = await owned_collection_with_album(real_session)

        owned = await make_external_reference_service(real_session).find_owned_pressings(
            user.id, album.external_album_id, None)

        assert [(o.album_id, o.same_release) for o in owned] == [(album.id, True)]

    async def test_other_users_collections_are_ignored(self, real_session):
        _, _, album = await owned_collection_with_album(real_session)
        stranger = await make_test_user(real_session)

        owned = await make_external_reference_service(real_session).find_owned_pressings(
            stranger.id, album.external_album_id, None)

        assert owned == []


class TestCollectionCountsWorks:
    async def test_pressings_of_one_work_count_once(self, real_session):
        user = await make_test_user(real_session)
        collection = await make_test_collection(real_session, owner_id=user.id)
        original, reissue, other = await existing_albums(real_session, 3)
        master = f"itest-{uuid.uuid4().hex[:8]}"
        original.external_master_id = master
        reissue.external_master_id = master
        await CollectionRepository(real_session).add_albums(collection, [original.id, reissue.id, other.id])
        real_session.expunge_all()

        counts = await CollectionRepository(real_session).get_collection_counts(collection.id)
        [listed], _ = await make_collection_service(real_session).get_user_collections(user.id, 1, 12)

        assert counts["albums_count"] == 2
        assert listed.albums_count == 2


class TestCollectionRecords:
    @staticmethod
    async def library(session):
        """Kind of Blue in two pressings (the first one in two copies), plus another record added last."""
        user = await make_test_user(session)
        collection = await make_test_collection(session, owner_id=user.id)
        original, reissue, other = await existing_albums(session, 3)
        master = f"itest-{uuid.uuid4().hex[:8]}"
        original.external_master_id = master
        reissue.external_master_id = master
        other.external_master_id = None
        service = make_collection_service(session)
        for album in (original, reissue, other):
            await service.add_album_to_collection(
                user.id, collection.id, CollectionAlbumCreate(album_id=album.id, collection_id=collection.id))
        await service.add_album_copy(user.id, collection.id, original.id, CollectionAlbumCopyData())
        session.expunge_all()
        return user, collection, (original, reissue, other), master

    async def test_pressings_of_a_work_are_one_record(self, real_session):
        user, collection, (original, reissue, other), master = await self.library(real_session)

        page = await make_collection_service(real_session).get_collection_records_paginated(
            collection.id, user.id, 1, 12, "oldest")

        assert page.total == 2
        kind_of_blue, last = page.items
        assert kind_of_blue.work_key == master
        assert [p.id for p in kind_of_blue.pressings] == [original.id, reissue.id]
        assert (kind_of_blue.pressings_count, kind_of_blue.copies_count) == (2, 3)
        assert (kind_of_blue.title, kind_of_blue.image_url) == (original.title, original.image_url)
        assert last.work_key == f"release:{other.id}"

    async def test_newest_first_by_last_added_pressing(self, real_session):
        user, collection, (_, _, other), _ = await self.library(real_session)

        page = await make_collection_service(real_session).get_collection_records_paginated(
            collection.id, user.id, 1, 12, "newest")

        assert page.items[0].pressings[0].id == other.id

    async def test_pages_count_works(self, real_session):
        user, collection, _, master = await self.library(real_session)
        service = make_collection_service(real_session)

        first = await service.get_collection_records_paginated(collection.id, user.id, 1, 1, "oldest")
        second = await service.get_collection_records_paginated(collection.id, user.id, 2, 1, "oldest")

        assert (first.total, first.total_pages) == (2, 2)
        assert [first.items[0].work_key, len(second.items)] == [master, 1]

    async def test_private_collection_of_another_user(self, real_session):
        _, collection, _, _ = await self.library(real_session)
        collection.is_public = False
        await real_session.merge(collection)
        await real_session.flush()
        stranger = await make_test_user(real_session)

        with pytest.raises(ForbiddenError):
            await make_collection_service(real_session).get_collection_records_paginated(
                collection.id, stranger.id, 1, 12, "newest")


class TestExportCopies:
    async def test_one_row_per_copy_with_its_condition_and_the_pressing(self, real_session):
        user, collection, album = await owned_collection_with_album(real_session, state_record="mint")
        await make_collection_service(real_session).add_album_copy(
            user.id, collection.id, album.id, CollectionAlbumCopyData(state_record="fair", state_cover="good"))
        real_session.expunge_all()
        service = ExportService(CollectionRepository(real_session), CollectionAlbumRepository(real_session))

        response = await service.export_collection_albums_csv(collection.id, user.id)
        body = "".join([chunk if isinstance(chunk, str) else chunk.decode() async for chunk in response.body_iterator])

        rows = list(csv.DictReader(io.StringIO(body.lstrip("﻿")), delimiter=";"))
        assert [(r["copy_number"], r["copies_count"], r["state_record"], r["state_cover"]) for r in rows] == [
            ("1", "2", "mint", ""), ("2", "2", "fair", "good")]
        assert {r["album_id"] for r in rows} == {str(album.id)}
        assert rows[0]["pressing_confirmed"] == "no"
