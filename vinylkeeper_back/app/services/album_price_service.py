"""
Discogs suggested prices of the releases kept in collections, and the daily EUR exchange rates.
Both run in the nightly enrichment job (python -m app.cli.enrich_albums), never in a request.
"""
from datetime import date
from typing import Any, Optional

import httpx
from sqlalchemy import func, select

from app.core.logging import logger
from app.db.session import AsyncSessionLocal, engine
from app.repositories.album_price_repository import AlbumPriceRepository
from app.services.album_enrichment_service import (
    DiscogsAccessDeniedError,
    DiscogsClient,
    DiscogsUnavailableError,
    EnrichmentReport,
)

PRICE_CURRENCY = "EUR"
# Currencies a user can pick besides EUR
CONVERTED_CURRENCIES = ("USD",)
# ECB reference rates, free and without key
EXCHANGE_RATES_URL = "https://api.frankfurter.dev/v1/latest"
# Re-evaluations asked from the dashboard: half of the 60 requests/minute of the token,
# the other half stays for the live search. One run at a time on the whole server.
REQUEST_MIN_INTERVAL_SECONDS = 2.0
PRICE_LOCK_KEY = 7_420_291_002
REQUEST_BATCH_SIZE = 25

# Discogs condition -> vinyl_states.name, the same scale
DISCOGS_CONDITIONS = {
    "Mint (M)": "mint",
    "Near Mint (NM or M-)": "near_mint",
    "Very Good Plus (VG+)": "very_good_plus",
    "Very Good (VG)": "very_good",
    "Good Plus (G+)": "good_plus",
    "Good (G)": "good",
    "Fair (F)": "fair",
    "Poor (P)": "poor",
}


class PriceCurrencyError(Exception):
    """Discogs prices come in the seller currency of the token account, which must be EUR."""


def parse_price_suggestions(data: Optional[dict[str, Any]]) -> dict[str, Any]:
    """Album price columns from a /marketplace/price_suggestions payload ('none' without prices)."""
    suggestions: dict[str, float] = {}
    for condition, price in (data or {}).items():
        state = DISCOGS_CONDITIONS.get(condition)
        if state is None or not isinstance(price, dict) or not isinstance(price.get("value"), (int, float)):
            continue
        if price.get("currency") != PRICE_CURRENCY:
            raise PriceCurrencyError(f"Discogs prices are in {price.get('currency')}, set the seller currency to EUR")
        suggestions[state] = round(float(price["value"]), 2)
    if not suggestions:
        return {"status": "none", "price_very_good": None, "price_very_good_plus": None,
                "price_near_mint": None, "suggestions": None}
    return {
        "status": "ok",
        "price_very_good": suggestions.get("very_good"),
        "price_very_good_plus": suggestions.get("very_good_plus"),
        "price_near_mint": suggestions.get("near_mint"),
        "suggestions": suggestions,
    }


class AlbumPriceService:
    def __init__(self, repository: AlbumPriceRepository, client: DiscogsClient):
        self.repository = repository
        self.client = client

    async def price_release(self, album_id: int, external_album_id: str, report: EnrichmentReport) -> None:
        """Fetch and store the prices of one release. Raises what the Discogs client raises."""
        values = parse_price_suggestions(
            await self.client.get(f"/marketplace/price_suggestions/{external_album_id}"))
        await self.repository.save_prices(album_id, values)
        await self.repository.delete_request(album_id)
        if values["status"] == "ok":
            report.prices_done += 1
        else:
            report.prices_missing += 1

    async def work_requests(self, report: Optional[EnrichmentReport] = None) -> EnrichmentReport:
        """
        Re-evaluate the queued releases until the queue is empty. Stops when Discogs refuses or
        rate-limits: the rest stays queued for the next run (the nightly job runs it too).
        """
        report = report or EnrichmentReport()
        while batch := await self.repository.next_requests(REQUEST_BATCH_SIZE):
            for album_id, external_album_id in batch:
                try:
                    await self.price_release(album_id, external_album_id, report)
                except (DiscogsUnavailableError, PriceCurrencyError) as e:
                    logger.warning(f"Album price requests stopped: {e}")
                    report.prices_blocked = isinstance(e, (DiscogsAccessDeniedError, PriceCurrencyError))
                    await self.repository.db.commit()
                    return report
            await self.repository.db.commit()
        return report

    async def refresh_prices(
        self, limit: Optional[int] = None, commit_every: int = 25, report: Optional[EnrichmentReport] = None
    ) -> EnrichmentReport:
        """Missing prices first, then the oldest ones. Stops at once if Discogs refuses prices."""
        report = report or EnrichmentReport()
        pending = await self.repository.list_pending_prices(limit)
        logger.info(f"Album prices: {len(pending)} release(s) to price")
        for index, (album_id, external_album_id) in enumerate(pending, 1):
            try:
                await self.price_release(album_id, external_album_id, report)
            except (DiscogsAccessDeniedError, PriceCurrencyError) as e:
                # Seller settings undone or another currency: every next call would fail the same way
                logger.warning(f"Album prices stopped: {e}")
                report.prices_blocked = True
                break
            except DiscogsUnavailableError as e:
                logger.warning(f"Album prices: release {external_album_id} skipped: {e}")
                report.failed.append(f"price:{external_album_id}")
            if index % commit_every == 0:
                await self.repository.db.commit()
                logger.info(f"Album prices: {index}/{len(pending)} releases processed")
        await self.repository.db.commit()
        return report


async def refresh_exchange_rates(repository: AlbumPriceRepository, http_client: httpx.AsyncClient) -> bool:
    """Today's EUR rates. Keeps the previous ones when the source does not answer."""
    try:
        response = await http_client.get(
            EXCHANGE_RATES_URL, params={"base": PRICE_CURRENCY, "symbols": ",".join(CONVERTED_CURRENCIES)})
        response.raise_for_status()
        payload = response.json()
        rate_date = date.fromisoformat(payload["date"])
        rates = {currency: float(payload["rates"][currency]) for currency in CONVERTED_CURRENCIES}
    except (httpx.HTTPError, KeyError, TypeError, ValueError) as e:
        logger.warning(f"Exchange rates not refreshed, the previous ones stay: {e}")
        return False
    for currency, rate in rates.items():
        if rate > 0:
            await repository.save_rate(currency, rate, rate_date)
    await repository.db.commit()
    return True


async def run_price_requests() -> None:
    """
    Background task of the re-evaluate button: works through the queue while holding the price
    lock, so a single run spends the Discogs quota whatever the number of users. Never raises.
    """
    try:
        async with engine.connect() as lock_connection:
            if not (await lock_connection.execute(select(func.pg_try_advisory_lock(PRICE_LOCK_KEY)))).scalar():
                return  # Another run works through the same queue
            try:
                async with httpx.AsyncClient(timeout=httpx.Timeout(20.0, connect=10.0)) as http_client:
                    async with AsyncSessionLocal() as db:
                        repository = AlbumPriceRepository(db)
                        # A re-evaluation shows today's dollar too: one call, the previous rate stays on failure
                        await refresh_exchange_rates(repository, http_client)
                        client = DiscogsClient(http_client, min_interval=REQUEST_MIN_INTERVAL_SECONDS)
                        await AlbumPriceService(repository, client).work_requests()
            finally:
                await lock_connection.execute(select(func.pg_advisory_unlock(PRICE_LOCK_KEY)))
    except Exception as e:
        logger.error(f"Album price requests run failed: {str(e)}", exc_info=True)
