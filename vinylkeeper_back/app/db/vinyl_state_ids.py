"""
The ids of the record conditions (vinyl_states) must be the ones of the code (VinylStateMapping): the
conditions of the copies are stored and read by id, so a shifted id would show a mint record as poor,
without any error. At startup the table is brought back to these ids when it differs, its copies with it.
"""
from contextlib import asynccontextmanager
from typing import AsyncIterator, Optional

from sqlalchemy import delete, func, insert, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.db.session import engine
from app.models.collection_album import CollectionAlbumCopy
from app.models.reference_data.vinyl_state import VinylState
from app.utils.vinyl_state_mapping import VinylStateMapping

# One worker at a time checks and fixes the reference data, the others wait then find it right
REFERENCE_DATA_LOCK_KEY = 7_420_291_003
# Suffix of the name of a state while it moves to another id (names are unique)
MOVING_SUFFIX = "#moving"


class VinylStateIdsError(RuntimeError):
    """vinyl_states holds a state the code does not know: what it means cannot be guessed."""


@asynccontextmanager
async def reference_data_lock() -> AsyncIterator[None]:
    """Held while the block runs, on a connection of its own; the other workers wait for it."""
    async with engine.connect() as lock_connection:
        await lock_connection.execute(select(func.pg_advisory_lock(REFERENCE_DATA_LOCK_KEY)))
        try:
            yield
        finally:
            await lock_connection.execute(select(func.pg_advisory_unlock(REFERENCE_DATA_LOCK_KEY)))


async def _states(db: AsyncSession) -> dict[str, tuple[int, Optional[str]]]:
    rows = (await db.execute(select(VinylState.id, VinylState.name, VinylState.description))).all()
    return {name: (state_id, description) for state_id, name, description in rows}


async def vinyl_state_id_mismatches(db: AsyncSession) -> list[str]:
    """How vinyl_states differs from the ids the code relies on, empty when they match."""
    in_database = {name: state_id for name, (state_id, _) in (await _states(db)).items()}
    expected = VinylStateMapping.ids_by_name()
    problems = [
        f"{name}: id {in_database.get(name)} in the database, {state_id} in the code"
        for name, state_id in expected.items() if in_database.get(name) != state_id
    ]
    problems += [f"{name}: id {in_database[name]} in the database, unknown to the code"
                 for name in sorted(in_database.keys() - expected.keys())]
    return problems


async def move_state_id(db: AsyncSession, name: str, old_id: int, new_id: int, description: Optional[str]) -> None:
    """
    The state goes from old_id to new_id (free), and every copy that has it follows: the condition of a
    copy never changes. Plain inserts, updates and deletes: the foreign keys stay checked all along.
    """
    await db.execute(insert(VinylState).values(id=new_id, name=f"{name}{MOVING_SUFFIX}", description=description))
    await db.execute(update(CollectionAlbumCopy).where(CollectionAlbumCopy.state_record == old_id)
                     .values(state_record=new_id))
    await db.execute(update(CollectionAlbumCopy).where(CollectionAlbumCopy.state_cover == old_id)
                     .values(state_cover=new_id))
    await db.execute(delete(VinylState).where(VinylState.id == old_id))
    await db.execute(update(VinylState).where(VinylState.id == new_id).values(name=name))


async def conform_vinyl_state_ids(db: AsyncSession, missing_descriptions: dict[str, str]) -> list[str]:
    """
    Brings vinyl_states to the ids of the code, the copies with it, and returns what was changed (nothing
    when it already matches). The caller commits: all of it or nothing. A state unknown to the code is
    refused (VinylStateIdsError), the table untouched.
    """
    states = await _states(db)
    expected = VinylStateMapping.ids_by_name()
    unknown = sorted(states.keys() - expected.keys())
    if unknown:
        raise VinylStateIdsError(
            "vinyl_states holds states unknown to the code, which cannot be fixed by itself: "
            + ", ".join(f"{name} (id {states[name][0]})" for name in unknown))

    moving = [(name, state_id, description) for name, (state_id, description) in states.items()
              if state_id != expected[name]]
    missing = [name for name in expected if name not in states]
    if not moving and not missing:
        return []

    changes: list[str] = []
    # First every misplaced state goes to a free id far above, so that each id of the code is free
    # (two states may have swapped their ids), then each one comes down to its own id
    parked_from = max([state_id for state_id, _ in states.values()] + list(expected.values())) + 1
    parked = []
    for offset, (name, state_id, description) in enumerate(moving):
        await move_state_id(db, name, state_id, parked_from + offset, description)
        parked.append((name, state_id, parked_from + offset, description))
    for name, old_id, parked_id, description in parked:
        await move_state_id(db, name, parked_id, expected[name], description)
        changes.append(f"{name}: id {old_id} -> {expected[name]}")
    for name in missing:
        await db.execute(insert(VinylState).values(
            id=expected[name], name=name, description=missing_descriptions.get(name)))
        changes.append(f"{name}: missing, added with id {expected[name]}")
    return changes


async def keep_sequence_past_the_ids(db: AsyncSession) -> None:
    """
    States are inserted with their ids: the sequence must not hand one of them out later. Only moves
    forward (setval is kept even if the transaction is rolled back).
    """
    await db.execute(text(
        "SELECT setval(pg_get_serial_sequence('vinyl_states', 'id'), max(id)) FROM vinyl_states "
        "HAVING max(id) > (SELECT last_value FROM vinyl_states_id_seq)"
    ))


async def fix_vinyl_state_ids(db: AsyncSession, missing_descriptions: dict[str, str]) -> None:
    """At startup, under the reference data lock: fixes and commits, logs what changed, raises if it cannot."""
    before = await vinyl_state_id_mismatches(db)
    if not before:
        return
    logger.warning("vinyl_states differs from the code, fixing it: " + "; ".join(before))
    changes = await conform_vinyl_state_ids(db, missing_descriptions)
    after = await vinyl_state_id_mismatches(db)
    if after:
        raise VinylStateIdsError("vinyl_states still differs from the code after the fix: " + "; ".join(after))
    await db.commit()
    logger.warning("vinyl_states fixed, the conditions of the copies kept: " + "; ".join(changes))
