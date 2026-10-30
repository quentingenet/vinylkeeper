from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

import app.services.dashboard_service as dashboard_service_module
from datetime import datetime, timedelta, timezone

from app.core.exceptions import QuotaExceededError, ResourceNotFoundError
from app.services.dashboard_service import DashboardService


@pytest.fixture(autouse=True)
def clear_dashboard_cache():
    """_cache is a module-level dict shared across the whole test session —
    clear it before/after each test so no test leaks a cached response into
    another (e.g. two tests reusing the same user_id)."""
    dashboard_service_module._cache.clear()
    yield
    dashboard_service_module._cache.clear()


def make_repo_and_service():
    repo = AsyncMock()
    repo.get_user_stats_batch = AsyncMock(return_value={
        "albums_total": 1, "artists_total": 1,
        "collections_total": 1, "public_collections_total": 1,
    })
    repo.get_global_collections_counts = AsyncMock(return_value={"albums_total": 10, "artists_total": 5})
    repo.get_latest_album = AsyncMock(return_value=None)
    repo.get_latest_artist = AsyncMock(return_value=None)
    repo.get_places_counts_batch = AsyncMock(return_value={"moderated_total": 2, "global_total": 3})
    repo.get_public_collections_count = AsyncMock(return_value=4)
    repo.get_recent_albums = AsyncMock(return_value=[])
    return repo, DashboardService(repo)


def make_user(user_id=1, username="jane"):
    return SimpleNamespace(id=user_id, username=username)


class TestDashboardCache:
    async def test_second_call_within_ttl_hits_cache_not_repository(self):
        repo, service = make_repo_and_service()
        user = make_user()

        first = await service.get_dashboard_stats(user)
        second = await service.get_dashboard_stats(user)

        assert first is second
        repo.get_user_stats_batch.assert_awaited_once()

    async def test_call_after_ttl_expiry_hits_repository_again(self, monkeypatch):
        repo, service = make_repo_and_service()
        user = make_user()

        fake_time = [1000.0]
        monkeypatch.setattr(dashboard_service_module.time, "monotonic", lambda: fake_time[0])

        await service.get_dashboard_stats(user)
        fake_time[0] += dashboard_service_module._CACHE_TTL + 1
        await service.get_dashboard_stats(user)

        assert repo.get_user_stats_batch.await_count == 2

    async def test_different_users_do_not_share_cache_entry(self):
        repo, service = make_repo_and_service()

        await service.get_dashboard_stats(make_user(user_id=1))
        await service.get_dashboard_stats(make_user(user_id=2))

        assert repo.get_user_stats_batch.await_count == 2


def make_breakdown_service(collections=((7, "Jazz"),)):
    repo = AsyncMock()
    repo.stats_collections = AsyncMock(return_value=list(collections))
    repo.pressing_counts = AsyncMock(return_value=SimpleNamespace(originals=3, reissues=2, total=6))
    repo.pressing_countries = AsyncMock(return_value=[("US", 4)])
    repo.pressing_formats = AsyncMock(return_value=[("LP", 6), ("Mono", 1)])
    spinning = AsyncMock()
    spinning.count_albums = AsyncMock(return_value=5)
    spinning.era_options = AsyncMock(return_value=[(1950, 2), (1960, 3)])
    spinning.genre_options = AsyncMock(return_value=[("Jazz", 5)])
    spinning.mood_options = AsyncMock(return_value=[("romantic", "Slow and tender", 2)])
    return DashboardService(repo, spinning), repo, spinning


class TestCollectionBreakdown:
    async def test_every_breakdown_of_all_collections(self):
        service, repo, spinning = make_breakdown_service()

        result = await service.get_breakdown(make_user())

        assert result.collection_id is None
        assert [(c.id, c.name) for c in result.collections] == [(7, "Jazz")]
        assert result.albums_total == 5
        assert [(e.decade, e.count) for e in result.eras] == [(1950, 2), (1960, 3)]
        assert [(g.label, g.count) for g in result.genres] == [("Jazz", 5)]
        assert [(m.label, m.count) for m in result.moods] == [("romantic", 2)]
        assert (result.pressings.originals, result.pressings.reissues, result.pressings.unknown) == (3, 2, 1)
        assert [(f.label, f.count) for f in result.pressings.formats] == [("LP", 6), ("Mono", 1)]
        spinning.era_options.assert_awaited_once_with(1, [])

    async def test_one_collection_limits_every_count(self):
        service, repo, spinning = make_breakdown_service()

        result = await service.get_breakdown(make_user(), collection_id=7)

        assert result.collection_id == 7
        for method in (spinning.count_albums, spinning.genre_options, spinning.mood_options,
                       repo.pressing_counts, repo.pressing_countries, repo.pressing_formats):
            assert method.await_args.args == (1, [7])

    async def test_a_collection_that_is_not_one_of_the_users_is_not_found(self):
        service, repo, _ = make_breakdown_service()

        with pytest.raises(ResourceNotFoundError):
            await service.get_breakdown(make_user(), collection_id=99)
        repo.pressing_counts.assert_not_called()


def make_value_service(rows=((7, "Jazz", 10), (8, "Blues", 30), (9, "Abba", 30)), rate=None):
    repo = AsyncMock()
    repo.stats_collections = AsyncMock(return_value=list(rows))
    repo.collection_value = AsyncMock(return_value=SimpleNamespace(
        records=4, priced=3, low=100, average=150.5, high=200, unconfirmed=2, updated_at=None, pending=0))
    repo.refreshable_album_ids = AsyncMock(return_value=[11, 12])
    repo.db.commit = AsyncMock()
    prices = AsyncMock()
    prices.get_rate = AsyncMock(return_value=rate)
    prices.request_refresh = AsyncMock(return_value=2)
    prices.recent_refreshes = AsyncMock(return_value=[])
    prices.record_refresh = AsyncMock()
    return DashboardService(repo, AsyncMock(), prices), repo, prices


def make_value_user(currency="EUR"):
    return SimpleNamespace(id=1, username="jane", preferred_currency=currency)


class TestCollectionValue:
    async def test_the_largest_collection_by_default_first_by_name_on_a_tie(self):
        service, repo, _ = make_value_service()

        result = await service.get_value(make_value_user())

        assert result.collection_id == 9
        assert repo.collection_value.await_args_list[0].args == (1, [9])
        [eur] = result.amounts
        assert (eur.currency, eur.low, eur.average, eur.high, result.currency) == ("EUR", 100, 150.5, 200, "EUR")
        assert (result.records_priced, result.records_total, result.pressings_to_confirm) == (3, 4, 2)
        assert result.refreshable == 2

    async def test_all_collections(self):
        service, repo, _ = make_value_service()

        result = await service.get_value(make_value_user(), all_collections=True)

        assert result.collection_id is None
        repo.collection_value.assert_awaited_once_with(1, [])

    async def test_someone_elses_collection_is_not_found(self):
        service, *_ = make_value_service()

        with pytest.raises(ResourceNotFoundError):
            await service.get_value(make_value_user(), collection_id=99)

    async def test_euros_and_dollars_at_the_last_known_rate(self):
        rate = SimpleNamespace(currency="USD", rate=1.1, rate_date="2026-10-29")
        service, *_ = make_value_service(rate=rate)

        result = await service.get_value(make_value_user("USD"))

        eur, usd = result.amounts
        assert (eur.currency, eur.low) == ("EUR", 100)
        assert (usd.currency, usd.low, usd.average) == ("USD", 110.0, 165.55)
        assert (result.currency, result.usd_rate, str(result.rate_date)) == ("USD", 1.1, "2026-10-29")

    async def test_eur_while_no_rate_is_known(self):
        service, *_ = make_value_service(rate=None)

        result = await service.get_value(make_value_user("USD"))

        assert (result.currency, [a.currency for a in result.amounts], result.usd_rate) == ("EUR", ["EUR"], None)

    async def test_one_collection_shown_but_the_re_evaluation_state_covers_every_collection(self):
        service, repo, _ = make_value_service()

        await service.get_value(make_value_user(), collection_id=7)

        assert [call.args for call in repo.collection_value.await_args_list] == [(1, [7]), (1,)]
        repo.refreshable_album_ids.assert_awaited_once_with(1)

    async def test_re_evaluation_queues_the_stale_pressings(self):
        service, repo, prices = make_value_service()
        repo.collection_value.return_value.pending = 2

        result = await service.request_value_refresh(make_value_user())

        prices.request_refresh.assert_awaited_once_with([11, 12])
        repo.refreshable_album_ids.assert_awaited_once_with(1)  # every collection
        assert (result.requested, result.pending, result.estimated_seconds) == (2, 2, 4)


class TestReEvaluationAllowance:
    async def test_one_a_day_then_refused_until_it_leaves_the_window(self):
        service, _, prices = make_value_service()
        last = datetime(2026, 10, 30, 8, tzinfo=timezone.utc)
        prices.recent_refreshes.return_value = [last]

        value = await service.get_value(make_value_user())
        with pytest.raises(QuotaExceededError) as refused:
            await service.request_value_refresh(make_value_user())

        assert (value.refreshes_left, value.next_refresh_at) == (0, last + timedelta(hours=24))
        assert refused.value.status_code == 429
        prices.request_refresh.assert_not_called()

    async def test_a_re_evaluation_is_counted_and_logged_with_the_username(self, monkeypatch):
        service, _, prices = make_value_service()
        logged = []
        monkeypatch.setattr(dashboard_service_module.logger, "info", logged.append)

        assert (await service.get_value(make_value_user())).refreshes_left == 1
        await service.request_value_refresh(make_value_user())

        prices.record_refresh.assert_awaited_once_with(1)
        assert logged == ["Collection value: jane re-evaluates their collections, 2 pressing(s) queued, 0 waiting"]

    async def test_prices_already_fresh_do_not_spend_the_allowance(self):
        service, repo, prices = make_value_service()
        repo.refreshable_album_ids.return_value = []
        prices.request_refresh.return_value = 0

        result = await service.request_value_refresh(make_value_user())

        assert result.requested == 0
        prices.record_refresh.assert_not_called()
