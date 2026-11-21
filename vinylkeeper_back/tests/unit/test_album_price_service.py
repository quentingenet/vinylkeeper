"""Discogs suggested prices, the re-evaluation queue and exchange rates (no network, no database)."""
from datetime import date
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

import app.services.album_price_service as price_module

from app.services.album_enrichment_service import (
    DiscogsAccessDeniedError,
    DiscogsUnavailableError,
)
from app.services.album_price_service import (
    AlbumPriceService,
    PriceCurrencyError,
    parse_price_suggestions,
    refresh_exchange_rates,
)

# Shape of a real /marketplace/price_suggestions/380980 response, trimmed
SUGGESTIONS = {
    "Mint (M)": {"currency": "EUR", "value": 199.58991749999998},
    "Near Mint (NM or M-)": {"currency": "EUR", "value": 178.58045249999998},
    "Very Good Plus (VG+)": {"currency": "EUR", "value": 136.5615225},
    "Very Good (VG)": {"currency": "EUR", "value": 94.5425925},
    "Poor (P)": {"currency": "EUR", "value": 10.504732500000001},
}


class TestParsePriceSuggestions:
    def test_three_prices_and_every_condition_keyed_like_vinyl_states(self):
        values = parse_price_suggestions(SUGGESTIONS)

        assert values["status"] == "ok"
        assert (values["price_very_good"], values["price_very_good_plus"], values["price_near_mint"]) == (
            94.54, 136.56, 178.58)
        assert values["suggestions"] == {"mint": 199.59, "near_mint": 178.58, "very_good_plus": 136.56,
                                         "very_good": 94.54, "poor": 10.5}

    @pytest.mark.parametrize("data", [None, {}, {"Unknown": {"currency": "EUR", "value": 3}},
                                      {"Mint (M)": {"currency": "EUR", "value": None}}])
    def test_no_usable_price_is_none(self, data):
        values = parse_price_suggestions(data)

        assert values["status"] == "none"
        assert values["price_very_good_plus"] is None and values["suggestions"] is None

    def test_another_currency_is_refused(self):
        with pytest.raises(PriceCurrencyError):
            parse_price_suggestions({"Mint (M)": {"currency": "USD", "value": 3}})


def make_service(get):
    repository = MagicMock()
    repository.db.commit = AsyncMock()
    repository.save_prices = AsyncMock()
    repository.delete_request = AsyncMock()
    client = MagicMock()
    client.get = get
    return AlbumPriceService(repository, client), repository


class TestWorkRequests:
    async def test_works_through_the_queue_until_empty(self):
        service, repository = make_service(AsyncMock(return_value=SUGGESTIONS))
        repository.next_requests = AsyncMock(side_effect=[[(1, "a"), (2, "b")], [(3, "c")], []])

        report = await service.work_requests()

        assert report.prices_done == 3
        assert [call.args[0] for call in repository.delete_request.await_args_list] == [1, 2, 3]

    async def test_a_rate_limit_leaves_the_rest_queued(self):
        service, repository = make_service(AsyncMock(side_effect=[SUGGESTIONS, DiscogsUnavailableError("429")]))
        repository.next_requests = AsyncMock(return_value=[(1, "a"), (2, "b"), (3, "c")])

        report = await service.work_requests()

        assert report.prices_done == 1 and not report.prices_blocked
        repository.delete_request.assert_awaited_once_with(1)
        repository.db.commit.assert_awaited()

    @pytest.mark.parametrize("error", [DiscogsAccessDeniedError("seller settings"), PriceCurrencyError("USD")])
    async def test_a_refusal_stops_at_once_and_keeps_the_queue(self, error):
        service, repository = make_service(AsyncMock(side_effect=error))
        repository.next_requests = AsyncMock(return_value=[(1, "a"), (2, "b")])

        report = await service.work_requests()

        assert report.prices_blocked
        repository.save_prices.assert_not_called()
        repository.delete_request.assert_not_called()


class TestExchangeRates:
    async def test_saves_the_rate_of_the_day(self):
        def handler(request):
            assert request.url.params["base"] == "EUR"
            return httpx.Response(200, json={"amount": 1.0, "base": "EUR", "date": "2026-10-29",
                                             "rates": {"USD": 1.113}})
        repository = MagicMock(save_rate=AsyncMock(), db=SimpleNamespace(commit=AsyncMock()))

        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            assert await refresh_exchange_rates(repository, client) is True

        repository.save_rate.assert_awaited_once_with("USD", 1.113, date(2026, 10, 29))

    @pytest.mark.parametrize("response", [httpx.Response(503), httpx.Response(200, json={"rates": {}})])
    async def test_keeps_the_previous_rate_when_the_source_fails(self, response):
        repository = MagicMock(save_rate=AsyncMock(), db=SimpleNamespace(commit=AsyncMock()))

        async with httpx.AsyncClient(transport=httpx.MockTransport(lambda request: response)) as client:
            assert await refresh_exchange_rates(repository, client) is False

        repository.save_rate.assert_not_called()


def lock_engine(taken: bool) -> tuple[MagicMock, AsyncMock]:
    """An engine whose connection answers pg_try_advisory_lock with `taken`."""
    connection = AsyncMock()
    connection.__aenter__.return_value = connection
    connection.execute.return_value = MagicMock(scalar=MagicMock(return_value=taken))
    return MagicMock(connect=MagicMock(return_value=connection)), connection


class TestPriceLock:
    async def test_taken_then_released_after_the_block(self):
        engine, connection = lock_engine(True)
        with patch.object(price_module, "engine", engine):
            async with price_module.price_lock() as acquired:
                assert acquired is True
                assert connection.execute.await_count == 1
        assert connection.execute.await_count == 2  # pg_advisory_unlock

    async def test_held_elsewhere_is_not_released_by_us(self):
        engine, connection = lock_engine(False)
        with patch.object(price_module, "engine", engine):
            async with price_module.price_lock() as acquired:
                assert acquired is False
        assert connection.execute.await_count == 1

    async def test_released_when_the_block_fails(self):
        engine, connection = lock_engine(True)
        with patch.object(price_module, "engine", engine):
            with pytest.raises(RuntimeError):
                async with price_module.price_lock():
                    raise RuntimeError("Discogs down")
        assert connection.execute.await_count == 2

    async def test_the_button_does_nothing_while_another_run_holds_the_lock(self):
        engine, _ = lock_engine(False)
        with patch.object(price_module, "engine", engine), \
                patch.object(price_module, "AlbumPriceService") as service:
            await price_module.run_price_requests()
        service.assert_not_called()
