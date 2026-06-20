from fastapi import FastAPI
from starlette.exceptions import HTTPException as StarletteHTTPException
from httpx import AsyncClient, ASGITransport
from pydantic import BaseModel

from app.core.handlers import register_exception_handlers
from app.core.exceptions import (
    AccountLockedError,
    DuplicateCollectionNameError,
    DuplicateEmailError,
    EmailNotFoundError,
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
        assert resp.status_code == 401
        assert resp.json()["code"] == ErrorCode.INVALID_TOKEN

    async def test_refresh_token_not_found(self):
        resp = await call(make_app_raising(RefreshTokenNotFoundError))
        assert resp.status_code == 401
        assert resp.json()["code"] == ErrorCode.REFRESH_TOKEN_NOT_FOUND

    async def test_unauthorized(self):
        resp = await call(make_app_raising(lambda: UnauthorizedError("test")))
        assert resp.status_code == 401
        assert resp.json()["code"] == ErrorCode.INVALID_TOKEN

    async def test_email_not_found(self):
        resp = await call(make_app_raising(lambda: EmailNotFoundError("x@x.com")))
        assert resp.status_code == 401
        assert resp.json()["code"] == ErrorCode.EMAIL_NOT_FOUND


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
        resp = await call_permissive(make_unhandled_app())
        body = resp.json()
        assert body["code"] == 9999
        assert body["message"] == "Internal Server Error"
        assert body["details"] == {}
