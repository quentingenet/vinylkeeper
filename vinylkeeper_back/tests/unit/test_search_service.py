import pytest
from unittest.mock import AsyncMock

from app.services.search_service import SearchService
from app.core.exceptions import ServerError


def make_service_with_failing_client(exc: Exception) -> SearchService:
    client = AsyncMock()
    client.get = AsyncMock(side_effect=exc)
    return SearchService(http_client=client)


class TestGetArtistMetadataErrorLeak:
    async def test_unexpected_error_does_not_leak_exception_text(self):
        """Regression test: details used to include str(e), which could leak
        internal network/timeout/URL details straight into the HTTP response
        (app/core/handlers.py forwards ServerError.detail verbatim to the
        client). details must only contain the safe artist_id identifier."""
        service = make_service_with_failing_client(
            RuntimeError("connection refused to internal-host:5432, secret=abc123")
        )

        with pytest.raises(ServerError) as exc_info:
            await service.get_artist_metadata("123")

        details = exc_info.value.detail["details"]
        assert details == {"artist_id": "123"}
        assert "secret" not in str(details)
        assert "internal-host" not in str(details)


class TestGetAlbumMetadataErrorLeak:
    async def test_unexpected_error_does_not_leak_exception_text(self):
        service = make_service_with_failing_client(
            RuntimeError("connection refused to internal-host:5432, secret=abc123")
        )

        with pytest.raises(ServerError) as exc_info:
            await service.get_album_metadata("456")

        details = exc_info.value.detail["details"]
        assert details == {"album_id": "456"}
        assert "secret" not in str(details)
        assert "internal-host" not in str(details)
