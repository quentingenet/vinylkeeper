"""Spinning now service: filter validation and response mapping (repository mocked)."""
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.core.exceptions import ValidationError
from app.repositories.spinning_now_repository import SpinningNowFilters
from app.services.spinning_now_service import MAX_FILTER_VALUES, MAX_LIMIT, SpinningNowService


def album(album_id: int, **values) -> SimpleNamespace:
    defaults = dict(id=album_id, external_album_id=str(1000 + album_id), title="AC/DC - Highway To Hell",
                    artist_name="AC/DC", image_url="https://i.discogs.com/x.jpg", original_year=1979,
                    release_year=2003, genres=["Rock"], styles=["Hard Rock"])
    return SimpleNamespace(**{**defaults, **values})


def make_service(albums=(), total=None, moods_by_album=None, collections_by_album=None):
    repository = AsyncMock()
    repository.count_matching = AsyncMock(return_value=len(albums) if total is None else total)
    repository.random_matching = AsyncMock(return_value=list(albums))
    repository.moods_by_album = AsyncMock(return_value=moods_by_album or {})
    repository.collections_by_album = AsyncMock(return_value=collections_by_album or {})
    return SpinningNowService(repository), repository


class TestGetOptions:
    async def test_maps_repository_rows(self):
        repository = AsyncMock()
        repository.count_albums = AsyncMock(return_value=83)
        repository.mood_options = AsyncMock(return_value=[("calm", "Peaceful.", 12)])
        repository.era_options = AsyncMock(return_value=[(1950, 3), (1970, 20)])
        repository.genre_options = AsyncMock(return_value=[("Jazz", 30)])
        repository.collection_options = AsyncMock(return_value=[(7, "Mine", 50), (8, "Sundays", 33)])

        options = await SpinningNowService(repository).get_options(user_id=1)

        assert options.total_albums == 83
        assert options.moods[0].model_dump() == {"name": "calm", "description": "Peaceful.", "albums_count": 12}
        assert [era.decade for era in options.eras] == [1950, 1970]
        assert options.genres[0].name == "Jazz"
        assert [(c.id, c.name, c.albums_count) for c in options.collections] == [(7, "Mine", 50), (8, "Sundays", 33)]


class TestPick:
    async def test_maps_albums_with_moods_and_collections(self):
        service, repository = make_service(
            albums=[album(1)], moods_by_album={1: ["energetic"]},
            collections_by_album={1: [(7, "Mine"), (8, "Sundays")]},
        )

        result = await service.pick(1, ["energetic"], [1970], ["Rock"], [7, 8], limit=5)

        assert result.total == 1
        item = result.items[0]
        assert (item.year, item.moods) == (1979, ["energetic"])
        assert [(c.id, c.name) for c in item.collections] == [(7, "Mine"), (8, "Sundays")]
        expected = SpinningNowFilters(["energetic"], [1970], ["Rock"], [7, 8])
        repository.random_matching.assert_awaited_once_with(1, expected, 5)
        repository.collections_by_album.assert_awaited_once_with(1, [1])

    async def test_pressing_year_is_used_when_original_year_is_unknown(self):
        service, _ = make_service(albums=[album(1, original_year=None)])

        assert (await service.pick(1, [], [], [], [])).items[0].year == 2003

    async def test_missing_tags_become_empty_lists(self):
        service, _ = make_service(albums=[album(1, genres=None, styles=None)])

        item = (await service.pick(1, [], [], [], [])).items[0]

        assert (item.genres, item.styles, item.moods, item.collections) == ([], [], [], [])

    async def test_no_match_skips_the_random_query(self):
        service, repository = make_service(albums=[], total=0)

        result = await service.pick(1, ["calm"], [], [], [])

        assert (result.total, result.items) == (0, [])
        repository.random_matching.assert_not_called()

    async def test_filters_are_deduplicated_and_trimmed(self):
        service, repository = make_service()

        await service.pick(1, ["calm", "calm"], [1970, 1970], [" Jazz ", "Jazz", " "], [7, 7])

        repository.count_matching.assert_awaited_once_with(1, SpinningNowFilters(["calm"], [1970], ["Jazz"], [7]))

    @pytest.mark.parametrize("moods, eras, genres, collections, limit", [
        (["unknown"], [], [], [], 12),
        ([], [1975], [], [], 12),
        ([], [1890], [], [], 12),
        ([], [2100], [], [], 12),
        ([], [], ["x" * 101], [], 12),
        ([], [], [], [0], 12),
        ([], [], [], [-3], 12),
        ([], [], [], [], 0),
        ([], [], [], [], MAX_LIMIT + 1),
        ([], [], [f"g{i}" for i in range(MAX_FILTER_VALUES + 1)], [], 12),
        ([], [], [], list(range(1, MAX_FILTER_VALUES + 2)), 12),
    ])
    async def test_invalid_filters_are_rejected(self, moods, eras, genres, collections, limit):
        service, repository = make_service()

        with pytest.raises(ValidationError):
            await service.pick(1, moods, eras, genres, collections, limit)
        repository.count_matching.assert_not_called()
