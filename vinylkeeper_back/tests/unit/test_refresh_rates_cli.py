"""CLI wiring of the late afternoon exchange rates refresh (no database, no network)."""
from datetime import date
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import app.cli.refresh_rates as cli


def patched(refreshed: bool, rate):
    session = AsyncMock()
    session.__aenter__.return_value = session
    repository = MagicMock(get_rate=AsyncMock(return_value=rate))
    return (
        patch.object(cli, "AsyncSessionLocal", return_value=session),
        patch.object(cli, "AlbumPriceRepository", return_value=repository),
        patch.object(cli, "refresh_exchange_rates", new=AsyncMock(return_value=refreshed)),
    )


async def test_prints_the_rate_of_the_day(capsys):
    session, repository, refresh = patched(True, SimpleNamespace(rate=1.113, rate_date=date(2026, 10, 30)))
    with session, repository, refresh:
        assert await cli.run() is True

    out = capsys.readouterr().out
    assert "USD: 1 EUR = 1.113 USD (ECB rate of 2026-10-30)" in out
    assert "Done: rates refreshed" in out


async def test_says_when_the_previous_rate_stays(capsys):
    session, repository, refresh = patched(False, None)
    with session, repository, refresh:
        assert await cli.run() is False

    out = capsys.readouterr().out
    assert "USD: no rate yet" in out
    assert "previous rates stay" in out
