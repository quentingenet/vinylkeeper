"""
Real-database tests for the collection value: prices, the re-evaluation queue, the daily
allowance and the user currency. Same safety model as test_real_db_relationships.py:
everything runs in an outer transaction that is rolled back.
"""
from datetime import date, timedelta

from sqlalchemy import text, update

from app.models.album_price_model import AlbumPrice
from app.models.collection_album import CollectionAlbumCopy
from app.repositories.album_price_repository import AlbumPriceRepository
from app.repositories.dashboard_repository import DashboardRepository
from app.repositories.user_repository import UserRepository
from app.services.user_service import UserService

from tests.integration.conftest import make_real_test_user as make_test_user
from tests.integration.test_dashboard_integration import make_pressing
from tests.integration.test_real_db_relationships import make_test_collection, put_album_in_collection


def priced(very_good, very_good_plus, near_mint):
    return {"status": "ok", "price_very_good": very_good, "price_very_good_plus": very_good_plus,
            "price_near_mint": near_mint, "suggestions": {"very_good": very_good}}


class TestCollectionValue:
    async def test_copies_count_and_a_pressing_in_two_collections_counts_once(self, real_session):
        user = await make_test_user(real_session)
        first = await make_test_collection(real_session, owner_id=user.id)
        second = await make_test_collection(real_session, owner_id=user.id)
        rare = await make_pressing(real_session)
        common = await make_pressing(real_session)
        unpriced = await make_pressing(real_session)
        await put_album_in_collection(real_session, first.id, rare.id)
        real_session.add(CollectionAlbumCopy(collection_id=first.id, album_id=rare.id))  # a second copy
        await put_album_in_collection(real_session, first.id, common.id)
        await put_album_in_collection(real_session, second.id, common.id)
        await put_album_in_collection(real_session, second.id, unpriced.id)
        prices = AlbumPriceRepository(real_session)
        await prices.save_prices(rare.id, priced(100, 150, 200))
        await prices.save_prices(common.id, priced(5, 8, 10))
        await real_session.flush()
        repo = DashboardRepository(real_session)

        everything = await repo.collection_value(user.id)
        only_second = await repo.collection_value(user.id, [second.id])

        assert (everything.records, everything.priced) == (3, 2)
        assert (float(everything.low), float(everything.average), float(everything.high)) == (205, 308, 410)
        assert everything.unconfirmed == 3 and everything.updated_at is not None
        assert (only_second.records, float(only_second.average)) == (2, 8)

    async def test_saved_copies_are_left_out(self, real_session):
        user = await make_test_user(real_session)
        kept = await make_test_collection(real_session, owner_id=user.id)
        saved = await make_test_collection(real_session, owner_id=user.id)
        saved.saved_from_collection_id = kept.id
        only_saved = await make_pressing(real_session)
        await put_album_in_collection(real_session, saved.id, only_saved.id)
        await AlbumPriceRepository(real_session).save_prices(only_saved.id, priced(1, 2, 3))
        await real_session.flush()

        value = await DashboardRepository(real_session).collection_value(user.id)

        assert (value.records, float(value.average)) == (0, 0)


class TestReEvaluationQueue:
    async def test_only_missing_or_day_old_prices_are_queued_once(self, real_session):
        user = await make_test_user(real_session)
        collection = await make_test_collection(real_session, owner_id=user.id)
        missing, fresh, old = [await make_pressing(real_session) for _ in range(3)]
        for album in (missing, fresh, old):
            await put_album_in_collection(real_session, collection.id, album.id)
        prices = AlbumPriceRepository(real_session)
        await prices.save_prices(fresh.id, priced(1, 2, 3))
        await prices.save_prices(old.id, priced(1, 2, 3))
        await real_session.execute(update(AlbumPrice).where(AlbumPrice.album_id == old.id)
                                   .values(fetched_at=text("now() - interval '2 days'")))
        repo = DashboardRepository(real_session)

        refreshable = set(await repo.refreshable_album_ids(user.id))
        added = await prices.request_refresh(sorted(refreshable))
        again = await prices.request_refresh(sorted(refreshable))

        assert refreshable == {missing.id, old.id}
        assert (added, again) == (2, 0)
        assert await repo.refreshable_album_ids(user.id) == []  # queued ones are not asked twice
        assert (await repo.collection_value(user.id)).pending == 2
        queued = {album_id for album_id, _ in await prices.next_requests(500)}
        assert {missing.id, old.id} <= queued

    async def test_a_price_saved_leaves_the_queue(self, real_session):
        user = await make_test_user(real_session)
        collection = await make_test_collection(real_session, owner_id=user.id)
        album = await make_pressing(real_session)
        await put_album_in_collection(real_session, collection.id, album.id)
        prices = AlbumPriceRepository(real_session)
        await prices.request_refresh([album.id])

        await prices.save_prices(album.id, priced(1, 2, 3))
        await prices.delete_request(album.id)

        assert (await DashboardRepository(real_session).collection_value(user.id)).pending == 0

    async def test_pending_prices_put_the_missing_ones_first(self, real_session):
        user = await make_test_user(real_session)
        collection = await make_test_collection(real_session, owner_id=user.id)
        album = await make_pressing(real_session)
        await put_album_in_collection(real_session, collection.id, album.id)

        pending = [album_id for album_id, _ in await AlbumPriceRepository(real_session).list_pending_prices()]

        assert album.id in pending
        missing_ids = set((await real_session.execute(text(
            "SELECT ca.album_id FROM collection_album ca LEFT JOIN album_prices p ON p.album_id = ca.album_id "
            "WHERE p.album_id IS NULL"))).scalars())
        assert set(pending[:len(missing_ids)]) <= missing_ids | {album.id}


class TestAllowanceAndCurrency:
    async def test_re_evaluations_are_counted_per_user_within_the_window(self, real_session):
        user, other = await make_test_user(real_session), await make_test_user(real_session)
        prices = AlbumPriceRepository(real_session)
        await prices.record_refresh(user.id)
        await prices.record_refresh(user.id)
        await prices.record_refresh(other.id)

        assert len(await prices.recent_refreshes(user.id, timedelta(hours=24))) == 2
        assert len(await prices.recent_refreshes(other.id, timedelta(hours=24))) == 1

    async def test_a_new_user_sees_eur_then_picks_usd(self, real_session):
        user = await make_test_user(real_session)
        assert user.preferred_currency == "EUR"
        service = UserService(UserRepository(real_session), None)

        await service.set_preferred_currency(user, "USD")

        stored = (await real_session.execute(
            text("SELECT preferred_currency FROM users WHERE id = :id"), {"id": user.id})).scalar_one()
        assert stored == "USD"
        assert (await service.get_user_settings(user))["preferred_currency"] == "USD"

    async def test_the_rate_is_replaced_not_duplicated(self, real_session):
        prices = AlbumPriceRepository(real_session)
        await prices.save_rate("USD", 1.1, date(2026, 10, 29))
        await prices.save_rate("USD", 1.2, date(2026, 10, 30))

        rate = await prices.get_rate("USD")

        assert (float(rate.rate), rate.rate_date) == (1.2, date(2026, 10, 30))
