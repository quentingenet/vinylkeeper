"""Discogs suggested prices, the re-evaluation queue and exchange rates (no network, no database)."""
from datetime import date
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest

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


class TestRefreshPrices:
    async def test_prices_are_saved_and_counted(self):
        service, repository = make_service(AsyncMock(side_effect=[SUGGESTIONS, {}]))
        repository.list_pending_prices = AsyncMock(return_value=[(1, "380980"), (2, "9")])

        report = await service.refresh_prices()

        assert (report.prices_done, report.prices_missing) == (1, 1)
        assert repository.save_prices.await_args_list[1].args == (2, parse_price_suggestions({}))
        repository.delete_request.assert_awaited_with(2)

    @pytest.mark.parametrize("error", [DiscogsAccessDeniedError("seller settings"), PriceCurrencyError("USD")])
    async def test_a_refusal_stops_at_once_without_marking_anything(self, error):
        service, repository = make_service(AsyncMock(side_effect=error))
        repository.list_pending_prices = AsyncMock(return_value=[(1, "a"), (2, "b")])

        report = await service.refresh_prices()

        assert report.prices_blocked
        repository.save_prices.assert_not_called()

    async def test_a_transient_failure_skips_the_release(self):
        service, repository = make_service(AsyncMock(side_effect=[DiscogsUnavailableError("429"), SUGGESTIONS]))
        repository.list_pending_prices = AsyncMock(return_value=[(1, "a"), (2, "b")])

        report = await service.refresh_prices()

        assert report.failed == ["price:a"] and report.prices_done == 1


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
