"""
Fetch today's EUR exchange rates (ECB reference rates, published around 16:00 Paris time on
working days). One call, no Discogs request: run it in the late afternoon so the dollar value
of the collections follows the rate of the same day. The nightly enrichment job fetches them too.

Usage (from vinylkeeper_back/):
    poetry run python -m app.cli.refresh_rates
"""
import asyncio

import httpx

from app.db.session import AsyncSessionLocal, engine
from app.repositories.album_price_repository import AlbumPriceRepository
from app.services.album_price_service import CONVERTED_CURRENCIES, refresh_exchange_rates


async def run() -> bool:
    async with httpx.AsyncClient(timeout=httpx.Timeout(20.0, connect=10.0)) as http_client:
        async with AsyncSessionLocal() as db:
            repository = AlbumPriceRepository(db)
            refreshed = await refresh_exchange_rates(repository, http_client)
            for currency in CONVERTED_CURRENCIES:
                rate = await repository.get_rate(currency)
                if rate is None:
                    print(f"{currency}: no rate yet")
                else:
                    print(f"{currency}: 1 EUR = {rate.rate} {currency} (ECB rate of {rate.rate_date})")
    print("Done: rates refreshed" if refreshed else "Done: source unavailable, the previous rates stay")
    return refreshed


def main() -> None:
    async def _main() -> None:
        try:
            await run()
        finally:
            await engine.dispose()

    asyncio.run(_main())


if __name__ == "__main__":
    main()
