"""
A page of works is read in two steps: the keys of the page, then their pressings. A pressing
enriched in between (its Discogs master found) changes work, so one key may come back with no
pressing: the page skips it instead of failing (IndexError seen in production).
"""
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.repositories.collection_album_repository import CollectionAlbumRepository
from app.repositories.wishlist_repository import WishlistRepository


def _results(page_keys, total, rows):
    keys_result = MagicMock()
    keys_result.scalars.return_value.all.return_value = page_keys
    total_result = MagicMock()
    total_result.scalar.return_value = total
    rows_result = MagicMock()
    rows_result.all.return_value = rows
    return [keys_result, total_result, rows_result]


def _db(results):
    db = MagicMock()
    db.execute = AsyncMock(side_effect=results)
    return db


@pytest.mark.asyncio
async def test_collection_page_skips_a_work_left_empty():
    album, collection_album = MagicMock(), MagicMock()
    # "release:7" got its master id between the two reads: no pressing left under that key
    db = _db(_results(["123", "release:7"], 2, [(album, collection_album, "123")]))

    works, total = await CollectionAlbumRepository(db).get_collection_records_paginated(1)

    assert works == [("123", [(album, collection_album)])]
    assert total == 2


@pytest.mark.asyncio
async def test_wishlist_page_skips_a_work_left_empty():
    wishlist, album = MagicMock(), MagicMock()
    db = _db(_results(["release:7", "123"], 2, [(wishlist, "album", album, "123")]))

    works, total = await WishlistRepository(db).get_user_wishlist_paginated(1)

    assert works == [("123", [(wishlist, "album", album)])]
    assert total == 2
