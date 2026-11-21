"""The ids of the record conditions: the code, the enum and the vinyl_states table must agree."""
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import FastAPI

from app.core import lifespan as lifespan_module
from app.core.enums import VinylStateEnum
from app.db.vinyl_state_ids import VinylStateIdsError, vinyl_state_id_mismatches
from app.utils.vinyl_state_mapping import VinylStateMapping

EXPECTED = [(index, state.value) for index, state in enumerate(VinylStateEnum, start=1)]


def test_the_mapping_follows_the_order_of_the_enum():
    """Every state of the enum has its id in the code, in the order of the enum."""
    assert VinylStateMapping.ids_by_name() == {name: state_id for state_id, name in EXPECTED}
    assert all(VinylStateMapping.get_name_from_id(state_id) == name for state_id, name in EXPECTED)


def database_with(rows):
    db = MagicMock()
    rows = [(state_id, name, None) for state_id, name in rows]
    db.execute = AsyncMock(return_value=MagicMock(all=MagicMock(return_value=rows)))
    return db


async def test_ids_that_match_give_no_mismatch():
    assert await vinyl_state_id_mismatches(database_with(EXPECTED)) == []


async def test_shifted_ids_are_found():
    """The silent case: every state exists, under another id."""
    rows = [(state_id + 3330, name) for state_id, name in EXPECTED]

    mismatches = await vinyl_state_id_mismatches(database_with(rows))

    assert len(mismatches) == 9
    assert mismatches[0] == "mint: id 3331 in the database, 1 in the code"


async def test_swapped_missing_and_unknown_states_are_found():
    rows = [(2, "mint"), (1, "near_mint"), *EXPECTED[2:8], (10, "scratched")]

    mismatches = await vinyl_state_id_mismatches(database_with(rows))

    assert mismatches == [
        "mint: id 2 in the database, 1 in the code",
        "near_mint: id 1 in the database, 2 in the code",
        "not_defined: id None in the database, 9 in the code",
        "scratched: id 10 in the database, unknown to the code",
    ]


@asynccontextmanager
async def fake_context():
    yield MagicMock()


async def test_the_api_does_not_start_when_the_states_cannot_be_fixed():
    unfixable = AsyncMock(side_effect=VinylStateIdsError("vinyl_states holds states unknown to the code"))
    with patch.object(lifespan_module, "reference_data_lock", fake_context), \
            patch.object(lifespan_module, "AsyncSessionLocal", fake_context), \
            patch.object(lifespan_module, "check_reference_data_exists", AsyncMock(return_value=True)), \
            patch.object(lifespan_module, "fix_vinyl_state_ids", unfixable), \
            patch.object(lifespan_module, "httpx") as http:
        with pytest.raises(VinylStateIdsError, match="unknown to the code"):
            async with lifespan_module.lifespan(FastAPI()):
                pass
    http.AsyncClient.assert_not_called()
