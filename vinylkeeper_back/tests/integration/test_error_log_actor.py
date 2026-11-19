"""The error logs say whom a request was from: a username, or a masked email. Never a full address nor a password."""
import logging
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.core.exceptions import InvalidCredentialsError, ResourceNotFoundError
from app.core.handlers import register_exception_handlers
from app.core.logging import LogActorMiddleware, set_log_actor
from app.deps.deps import get_user_service
from app.main import app


@pytest.fixture
def app_log(caplog):
    """The "app" logger does not propagate to the root logger: caplog must listen to it directly."""
    app_logger = logging.getLogger("app")
    app_logger.addHandler(caplog.handler)
    caplog.set_level(logging.INFO, logger="app")
    yield caplog
    app_logger.removeHandler(caplog.handler)


async def test_a_failed_login_names_the_masked_email(app_log):
    service = AsyncMock()
    service.authenticate = AsyncMock(side_effect=InvalidCredentialsError())
    app.dependency_overrides[get_user_service] = lambda: service
    try:
        with patch("app.core.lifespan.check_reference_data_exists", new_callable=AsyncMock, return_value=True):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                credentials = {"email": "john@example.fr", "password": "s3cret!"}
                response = await client.post("/api/users/auth", json=credentials)
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 401
    assert "AppException (code 1000) by john@***: Invalid email or password" in app_log.text
    assert "example.fr" not in app_log.text
    assert "s3cret!" not in app_log.text


def handler_app(actor):
    """A route that names its actor (as a session or an email route does), then fails."""
    test_app = FastAPI()
    register_exception_handlers(test_app)
    test_app.add_middleware(LogActorMiddleware)

    @test_app.get("/test")
    async def trigger():
        if actor:
            set_log_actor(actor)
        raise ResourceNotFoundError("Collection", 4)

    return test_app


@pytest.mark.parametrize("actor, expected", [("jane", "by jane"), (None, "by anonymous")])
async def test_errors_name_who_the_request_is_from(app_log, actor, expected):
    async with AsyncClient(transport=ASGITransport(app=handler_app(actor)), base_url="http://test") as client:
        await client.get("/test")

    assert f"AppException (code {ResourceNotFoundError('Collection', 4).detail['code']}) {expected}:" in app_log.text


async def test_one_request_never_names_the_actor_of_another(app_log):
    # The same context for both requests, as two requests of a connection could share it: the middleware clears it
    async with AsyncClient(transport=ASGITransport(app=handler_app("jane")), base_url="http://test") as client:
        await client.get("/test")
    async with AsyncClient(transport=ASGITransport(app=handler_app(None)), base_url="http://test") as client:
        app_log.clear()
        await client.get("/test")

    assert "by anonymous" in app_log.text and "jane" not in app_log.text
