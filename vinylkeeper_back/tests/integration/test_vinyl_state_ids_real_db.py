"""
The ids of vinyl_states brought back to the ones of the code, on a real PostgreSQL (SAVEPOINT, nothing kept):
whatever the ids were, every copy keeps its condition.
"""
import pytest
from sqlalchemy import select, text
from sqlalchemy.orm import aliased

from app.db.init_references_data_db import VINYL_STATE_DESCRIPTIONS
from app.db.vinyl_state_ids import (
    VinylStateIdsError,
    conform_vinyl_state_ids,
    move_state_id,
    vinyl_state_id_mismatches,
)
from app.models.collection_album import CollectionAlbumCopy
from app.models.reference_data.vinyl_state import VinylState
from app.utils.vinyl_state_mapping import VinylStateMapping

from tests.integration.conftest import make_real_test_album, make_real_test_user
from tests.integration.test_real_db_relationships import make_test_collection, put_album_in_collection

FAR = 900_000


async def two_copies(session) -> list[int]:
    """Copies with conditions that make a swap visible: near_mint / good and poor / mint."""
    owner = await make_real_test_user(session)
    collection = await make_test_collection(session, owner_id=owner.id)
    first, second = await make_real_test_album(session), await make_real_test_album(session)
    await put_album_in_collection(session, collection.id, first.id, state_record="near_mint", state_cover="good")
    await put_album_in_collection(session, collection.id, second.id, state_record="poor", state_cover="mint")
    ids = (await session.execute(select(CollectionAlbumCopy.id).where(
        CollectionAlbumCopy.album_id.in_([first.id, second.id])).order_by(CollectionAlbumCopy.album_id))).scalars()
    return list(ids)


async def conditions(session, copy_ids: list[int]) -> list[tuple[str, str]]:
    """The condition of each copy by the names of its states, whatever their ids."""
    record, cover = aliased(VinylState), aliased(VinylState)
    rows = await session.execute(
        select(record.name, cover.name)
        .select_from(CollectionAlbumCopy)
        .join(record, record.id == CollectionAlbumCopy.state_record)
        .join(cover, cover.id == CollectionAlbumCopy.state_cover)
        .where(CollectionAlbumCopy.id.in_(copy_ids)).order_by(CollectionAlbumCopy.album_id))
    return [tuple(row) for row in rows.all()]


async def state(session, name: str) -> tuple[int, str]:
    return (await session.execute(
        select(VinylState.id, VinylState.description).where(VinylState.name == name))).one()


async def ids_of_copies(session, copy_ids: list[int]) -> list[tuple[int, int]]:
    rows = await session.execute(select(CollectionAlbumCopy.state_record, CollectionAlbumCopy.state_cover)
                                 .where(CollectionAlbumCopy.id.in_(copy_ids)).order_by(CollectionAlbumCopy.album_id))
    return [tuple(row) for row in rows.all()]


async def test_a_database_that_matches_is_left_as_it_is(real_session):
    assert await vinyl_state_id_mismatches(real_session) == []
    assert await conform_vinyl_state_ids(real_session, VINYL_STATE_DESCRIPTIONS) == []


async def test_shifted_ids_come_back_and_every_copy_keeps_its_condition(real_session):
    copies = await two_copies(real_session)
    kept = await conditions(real_session, copies)
    # As after reference data inserted on a sequence already used: every id far from the code
    for name, state_id in VinylStateMapping.ids_by_name().items():
        await move_state_id(real_session, name, state_id, FAR + state_id, (await state(real_session, name))[1])
    assert len(await vinyl_state_id_mismatches(real_session)) == 9
    assert await conditions(real_session, copies) == kept

    changes = await conform_vinyl_state_ids(real_session, VINYL_STATE_DESCRIPTIONS)

    assert len(changes) == 9 and changes[0] == f"mint: id {FAR + 1} -> 1"
    assert await vinyl_state_id_mismatches(real_session) == []
    assert await conditions(real_session, copies) == kept == [("near_mint", "good"), ("poor", "mint")]
    assert await ids_of_copies(real_session, copies) == [(2, 6), (8, 1)]
    # Descriptions travel with their state
    assert (await state(real_session, "mint"))[1] == VINYL_STATE_DESCRIPTIONS["mint"]


async def test_two_states_that_swapped_their_ids_are_swapped_back(real_session):
    """The worst case: no error anywhere, a mint record shown as poor. Every copy keeps its condition."""
    copies = await two_copies(real_session)
    kept = await conditions(real_session, copies)
    mint, poor = await state(real_session, "mint"), await state(real_session, "poor")
    await move_state_id(real_session, "mint", 1, FAR, mint[1])
    await move_state_id(real_session, "poor", 8, 1, poor[1])
    await move_state_id(real_session, "mint", FAR, 8, mint[1])
    assert await ids_of_copies(real_session, copies) == [(2, 6), (1, 8)]

    changes = await conform_vinyl_state_ids(real_session, VINYL_STATE_DESCRIPTIONS)

    assert sorted(changes) == ["mint: id 8 -> 1", "poor: id 1 -> 8"]
    assert await ids_of_copies(real_session, copies) == [(2, 6), (8, 1)]
    assert await conditions(real_session, copies) == kept
    assert await vinyl_state_id_mismatches(real_session) == []


async def test_a_state_unknown_to_the_code_is_refused_and_nothing_is_changed(real_session):
    copies = await two_copies(real_session)
    await move_state_id(real_session, "fair", 7, FAR, None)
    await real_session.execute(text("INSERT INTO vinyl_states (id, name) VALUES (:id, 'scratched')"), {"id": FAR + 1})

    with pytest.raises(VinylStateIdsError, match=rf"scratched \(id {FAR + 1}\)"):
        await conform_vinyl_state_ids(real_session, VINYL_STATE_DESCRIPTIONS)

    assert (await state(real_session, "fair"))[0] == FAR
    assert await ids_of_copies(real_session, copies) == [(2, 6), (8, 1)]


async def test_a_missing_state_is_added_with_its_id_and_description(real_session):
    # Inside the rolled back transaction: the copies that have it lose it, then it is removed
    await real_session.execute(text("UPDATE collection_album_copies SET state_record = NULL WHERE state_record = 7"))
    await real_session.execute(text("UPDATE collection_album_copies SET state_cover = NULL WHERE state_cover = 7"))
    await real_session.execute(text("DELETE FROM vinyl_states WHERE name = 'fair'"))

    changes = await conform_vinyl_state_ids(real_session, VINYL_STATE_DESCRIPTIONS)

    assert changes == ["fair: missing, added with id 7"]
    assert await state(real_session, "fair") == (7, VINYL_STATE_DESCRIPTIONS["fair"])
    assert await vinyl_state_id_mismatches(real_session) == []
