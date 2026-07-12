from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

import app.services.dashboard_service as dashboard_service_module
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
