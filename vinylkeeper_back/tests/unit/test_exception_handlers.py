import logging

import pytest
from fastapi import FastAPI
from starlette.exceptions import HTTPException as StarletteHTTPException
from httpx import AsyncClient, ASGITransport
from pydantic import BaseModel, Field, field_validator

from app.core.handlers import register_exception_handlers
from app.core.logging import mask_email
from app.services.discogs_oauth_service import not_connected_error
from app.core.exceptions import (
    AccountLockedError,
    DuplicateCollectionNameError,
    DuplicateEmailError,
    ForbiddenError,
    InvalidCredentialsError,
    InvalidResetTokenError,
    RefreshTokenNotFoundError,
    ResourceNotFoundError,
    ServerError,
    TermsNotAcceptedError,
    UnauthorizedError,
    ValidationError,
    ErrorCode,
)


# ---------------------------------------------------------------------------
# Minimal test app — only registers the handlers, no lifespan/DB
# ---------------------------------------------------------------------------

def make_app_raising(exc_factory) -> FastAPI:
    """Returns a FastAPI app with a single GET /test route that raises exc_factory()."""
    app = FastAPI()
    register_exception_handlers(app)

    @app.get("/test")
    async def trigger():
        raise exc_factory()

    return app


class _Body(BaseModel):
    value: int


def make_validation_app() -> FastAPI:
    """App whose POST /test requires a body with value:int — missing it triggers RequestValidationError."""
    app = FastAPI()
    register_exception_handlers(app)

    @app.post("/test")
    async def trigger(body: _Body):
        return body

    return app


class _PasswordBody(BaseModel):
    new_password: str = Field(min_length=8)


def make_validation_app_with_password() -> FastAPI:
    """App whose POST /test requires new_password (min_length=8) — a short value
    triggers RequestValidationError with 'input' carrying the raw candidate password."""
    app = FastAPI()
    register_exception_handlers(app)

    @app.post("/test")
    async def trigger(body: _PasswordBody):
        return body

    return app


class _LoginBody(BaseModel):
    email: str
    password: str


def make_login_validation_app() -> FastAPI:
    """App whose POST /test requires email and password, like the login form."""
    app = FastAPI()
    register_exception_handlers(app)

    @app.post("/test")
    async def trigger(body: _LoginBody):
        return body

    return app


class _EmailBody(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def refuse_example_domain(cls, v: str) -> str:
        # A message quoting the address, as some validators do
        raise ValueError(f"{v} is not accepted")


def make_email_validation_app() -> FastAPI:
    """App whose validation message contains the email address sent."""
    app = FastAPI()
    register_exception_handlers(app)

    @app.post("/test")
    async def trigger(body: _EmailBody):
        return body

    return app


@pytest.fixture
def app_log(caplog):
    """The "app" logger does not propagate to the root logger: caplog must listen to it directly."""
    app_logger = logging.getLogger("app")
    app_logger.addHandler(caplog.handler)
    caplog.set_level(logging.INFO, logger="app")
    yield caplog
    app_logger.removeHandler(caplog.handler)


def make_starlette_app(status_code: int, detail: str) -> FastAPI:
    """App that raises StarletteHTTPException."""
    app = FastAPI()
    register_exception_handlers(app)

    @app.get("/test")
    async def trigger():
        raise StarletteHTTPException(status_code=status_code, detail=detail)

    return app


def make_unhandled_app() -> FastAPI:
    """App that raises a raw Python exception (no AppException subclass)."""
    app = FastAPI()
    register_exception_handlers(app)

    @app.get("/test")
    async def trigger():
        raise RuntimeError("something went wrong")

    return app


async def call(app: FastAPI, method: str = "GET", path: str = "/test", json=None):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        return await c.request(method, path, json=json)


async def call_permissive(app: FastAPI, method: str = "GET", path: str = "/test", json=None):
    # raise_app_exceptions=False prevents httpx from re-raising the exception that
    # ServerErrorMiddleware propagates after sending the 500 response.
    async with AsyncClient(
        transport=ASGITransport(app=app, raise_app_exceptions=False),
        base_url="http://test",
    ) as c:
        return await c.request(method, path, json=json)


# ---------------------------------------------------------------------------
# Response shape helper
# ---------------------------------------------------------------------------

def assert_app_error(body: dict, *, status: int, code: int, resp_status: int):
    assert resp_status == status
    assert body["code"] == code
    assert isinstance(body["message"], str) and body["message"]
    assert isinstance(body["details"], dict)


# ---------------------------------------------------------------------------
# Authentication errors → 401
# ---------------------------------------------------------------------------

class TestAuthenticationErrors:
    async def test_invalid_credentials(self):
        resp = await call(make_app_raising(InvalidCredentialsError))
        assert resp.status_code == 401
        assert resp.json()["code"] == ErrorCode.INVALID_CREDENTIALS

    async def test_account_locked(self):
        resp = await call(make_app_raising(AccountLockedError))
        assert resp.status_code == 401
        assert resp.json()["code"] == ErrorCode.ACCOUNT_LOCKED

    async def test_terms_not_accepted(self):
        resp = await call(make_app_raising(TermsNotAcceptedError))
        assert resp.status_code == 401
        assert resp.json()["code"] == ErrorCode.TERMS_NOT_ACCEPTED

    async def test_invalid_reset_token(self):
        resp = await call(make_app_raising(InvalidResetTokenError))
        assert resp.status_code == 400
        assert resp.json()["code"] == ErrorCode.INVALID_TOKEN

    async def test_refresh_token_not_found(self):
        resp = await call(make_app_raising(RefreshTokenNotFoundError))
        assert resp.status_code == 401
        assert resp.json()["code"] == ErrorCode.REFRESH_TOKEN_NOT_FOUND

    async def test_unauthorized(self):
        resp = await call(make_app_raising(lambda: UnauthorizedError("test")))
        assert resp.status_code == 401
        assert resp.json()["code"] == ErrorCode.INVALID_TOKEN


# ---------------------------------------------------------------------------
# Resource errors → 404
# ---------------------------------------------------------------------------

class TestResourceErrors:
    async def test_resource_not_found(self):
        resp = await call(make_app_raising(lambda: ResourceNotFoundError("Collection", 42)))
        assert resp.status_code == 404
        assert resp.json()["code"] == ErrorCode.RESOURCE_NOT_FOUND

    async def test_details_contain_resource_info(self):
        resp = await call(make_app_raising(lambda: ResourceNotFoundError("Album", "abc-123")))
        body = resp.json()
        assert body["details"]["resource_type"] == "Album"
        assert body["details"]["resource_id"] == "abc-123"


# ---------------------------------------------------------------------------
# Validation errors → 400
# ---------------------------------------------------------------------------

class TestValidationErrors:
    async def test_validation_error(self):
        resp = await call(make_app_raising(lambda: ValidationError(ErrorCode.INVALID_INPUT, "bad input")))
        assert resp.status_code == 400
        assert resp.json()["code"] == ErrorCode.INVALID_INPUT

    async def test_duplicate_email(self):
        resp = await call(make_app_raising(lambda: DuplicateEmailError("dup@x.com")))
        assert resp.status_code == 400
        assert resp.json()["code"] == ErrorCode.RESOURCE_ALREADY_EXISTS

    async def test_discogs_not_connected_is_answered_but_not_logged(self, app_log):
        # A normal state (the dialog asks for the preview right after a disconnection), not an error
        resp = await call(make_app_raising(not_connected_error))
        assert resp.status_code == 400
        assert resp.json()["details"] == {"reason": "not_connected"}
        assert "Connect your Discogs account first" not in app_log.text

    async def test_duplicate_email_masked_in_logs(self, app_log):
        # Sign up and email change with a taken address: the log line keeps the user part only
        await call(make_app_raising(lambda: DuplicateEmailError("dup@example.com")))
        assert "Email already exists: dup@***" in app_log.text
        assert "example.com" not in app_log.text

    async def test_duplicate_collection_name(self):
        resp = await call(make_app_raising(lambda: DuplicateCollectionNameError("My Mix")))
        assert resp.status_code == 400
        assert resp.json()["code"] == ErrorCode.RESOURCE_ALREADY_EXISTS


# ---------------------------------------------------------------------------
# Forbidden → 403
# ---------------------------------------------------------------------------

class TestForbiddenErrors:
    async def test_forbidden(self):
        resp = await call(make_app_raising(ForbiddenError))
        assert resp.status_code == 403
        assert resp.json()["code"] == ErrorCode.FORBIDDEN

    async def test_forbidden_body_shape(self):
        resp = await call(make_app_raising(ForbiddenError))
        body = resp.json()
        assert set(body.keys()) == {"code", "message", "details"}


# ---------------------------------------------------------------------------
# Server errors → 500
# ---------------------------------------------------------------------------

class TestServerErrors:
    async def test_server_error(self):
        resp = await call(make_app_raising(lambda: ServerError(ErrorCode.SERVER_ERROR, "boom")))
        assert resp.status_code == 500
        assert resp.json()["code"] == ErrorCode.SERVER_ERROR

    async def test_server_error_with_details(self):
        resp = await call(make_app_raising(
            lambda: ServerError(ErrorCode.DATABASE_ERROR, "db down", {"table": "users"})
        ))
        body = resp.json()
        assert body["code"] == ErrorCode.DATABASE_ERROR
        assert body["details"]["table"] == "users"


# ---------------------------------------------------------------------------
# Pydantic RequestValidationError → 422
# ---------------------------------------------------------------------------

class TestRequestValidationError:
    async def test_missing_field_returns_422(self):
        resp = await call(make_validation_app(), method="POST", json={})
        assert resp.status_code == 422

    async def test_422_body_shape(self):
        resp = await call(make_validation_app(), method="POST", json={})
        body = resp.json()
        assert body["code"] == 3000
        assert body["message"] == "Validation error"
        assert "errors" in body["details"]
        assert isinstance(body["details"]["errors"], list)

    async def test_wrong_type_returns_422(self):
        resp = await call(make_validation_app(), method="POST", json={"value": "not-an-int"})
        assert resp.status_code == 422

    async def test_password_input_redacted_from_response(self):
        candidate = "abc"
        resp = await call(
            make_validation_app_with_password(), method="POST", json={"new_password": candidate}
        )
        body = resp.json()
        assert resp.status_code == 422
        assert candidate not in str(body)
        error = body["details"]["errors"][0]
        assert "input" not in error

    async def test_password_input_redacted_from_logs(self, app_log):
        # Shorter than min_length=8: the validation fails on it
        candidate = "s3cr3t"
        await call(
            make_validation_app_with_password(), method="POST", json={"new_password": candidate}
        )
        assert "Validation error" in app_log.text
        assert candidate not in app_log.text

    async def test_missing_field_keeps_password_out_of_response(self):
        # A missing field puts the whole body in "input": the password sent with it must not come back
        resp = await call(
            make_login_validation_app(), method="POST", json={"password": "MyS3cretPass", "emial": "a@b.fr"}
        )
        assert resp.status_code == 422
        assert "MyS3cretPass" not in resp.text
        error = resp.json()["details"]["errors"][0]
        assert error["loc"] == ["body", "email"]
        assert error["type"] == "missing"
        assert "input" not in error

    async def test_missing_field_keeps_password_out_of_logs(self, app_log):
        await call(
            make_login_validation_app(), method="POST", json={"password": "MyS3cretPass", "emial": "a@b.fr"}
        )
        assert "Validation error" in app_log.text
        assert "MyS3cretPass" not in app_log.text
        assert "a@b.fr" not in app_log.text

    async def test_email_masked_in_logs(self, app_log):
        await call(make_email_validation_app(), method="POST", json={"email": "john@example.fr"})
        assert "john@***" in app_log.text
        assert "example.fr" not in app_log.text


class TestMaskEmail:
    def test_masks_the_domain(self):
        assert mask_email("john@example.fr") == "john@***"

    def test_masks_every_address_of_a_text(self):
        assert mask_email("from a.b@x.org to c-d@mail.example.com") == "from a.b@*** to c-d@***"

    def test_leaves_text_without_address(self):
        assert mask_email("Field required") == "Field required"


# ---------------------------------------------------------------------------
# StarletteHTTPException → code 9998
# ---------------------------------------------------------------------------

class TestStarletteHttpException:
    async def test_404_returns_9998(self):
        resp = await call(make_starlette_app(404, "Not Found"))
        body = resp.json()
        assert resp.status_code == 404
        assert body["code"] == 9998
        assert body["message"] == "Not Found"
        assert body["details"] == {}

    async def test_405_returns_9998(self):
        resp = await call(make_starlette_app(405, "Method Not Allowed"))
        assert resp.status_code == 405
        assert resp.json()["code"] == 9998

    async def test_unknown_route_returns_9998(self):
        app = FastAPI()
        register_exception_handlers(app)
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            resp = await c.get("/nonexistent")
        assert resp.status_code == 404
        assert resp.json()["code"] == 9998


# ---------------------------------------------------------------------------
# Unhandled Exception → code 9999
# ---------------------------------------------------------------------------

class TestUnhandledException:
    async def test_returns_500(self):
        resp = await call_permissive(make_unhandled_app())
        assert resp.status_code == 500

    async def test_body_shape(self):
        """The body the endpoints answered when @handle_app_exceptions wrapped them, unchanged."""
        resp = await call_permissive(make_unhandled_app())
        body = resp.json()
        assert body == {"code": ErrorCode.SERVER_ERROR, "message": "An unexpected error occurred", "details": {}}

    async def test_a_database_error_is_an_unexpected_error_too(self):
        from sqlalchemy.exc import OperationalError

        resp = await call_permissive(make_app_raising(lambda: OperationalError("SELECT 1", {}, Exception("gone"))))

        assert resp.status_code == 500
        assert resp.json() == {"code": ErrorCode.SERVER_ERROR, "message": "An unexpected error occurred", "details": {}}

    async def test_traceback_logged(self, app_log):
        await call_permissive(make_unhandled_app())
        assert "Unhandled exception occurred" in app_log.text
        assert "Traceback" in app_log.text
        assert "RuntimeError: something went wrong" in app_log.text
