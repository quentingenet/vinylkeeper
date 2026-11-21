import os
import random
import uuid
from pathlib import Path

import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, ASGITransport
from email_validator import EmailNotValidError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from dotenv import dotenv_values

from app.db.init_references_data_db import check_reference_data_exists, insert_reference_values
from app.main import app
from app.deps.deps import get_session_service, get_user_service
from app.utils.auth_utils.auth import get_current_user, create_access_token
from tests.conftest import make_legacy_refresh_token
from app.core.security import hash_password
from app.models.user_model import User
from app.models.album_model import Album
from app.models.artist_model import Artist
from app.models.reference_data.external_sources import ExternalSource
from app.models.reference_data.roles import Role
from app.core.enums import ExternalSourceEnum
from tests.conftest import make_user


# ---------------------------------------------------------------------------
# Patch global : désactive la résolution DNS du validateur email
# Évite les dépendances réseau dans tous les tests d'intégration
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def no_email_dns_check():
    def fake_validate(email, check_deliverability=True):
        result = MagicMock()
        result.normalized = email
        if "@" not in email or "." not in email.split("@")[-1]:
            raise EmailNotValidError("Invalid email")
        return result

    with patch("app.schemas.user_schema.validate_email", side_effect=fake_validate):
        yield


# ---------------------------------------------------------------------------
# User fixture partagé
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_user():
    user = make_user(
        user_id=1,
        user_uuid="aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        role_name="user",
        is_superuser=False,
        is_active=True,
        password="correct_password",
    )
    user.username = "testuser"
    user.email = "test@example.com"
    user.is_accepted_terms = True
    user.number_of_connections = 1
    user.created_at = None
    return user


# ---------------------------------------------------------------------------
# Sessions de refresh token : les endpoints les écrivent en base, les tests HTTP sans base
# utilisent ce faux service (la vraie logique est testée dans test_refresh_sessions_real_db.py)
# ---------------------------------------------------------------------------

class FakeSessionService:
    """Same interface as SessionService, no database: tokens without session, calls recorded."""

    def __init__(self):
        self.opened: list = []
        self.rotated: list = []
        self.revoked: list = []

    @staticmethod
    def _token(user):
        return make_legacy_refresh_token(str(user.user_uuid), user.token_version)

    async def open(self, user, client="web"):
        self.opened.append((user, client))
        return self._token(user)

    async def rotate(self, user, payload, client="web"):
        self.rotated.append((user, payload, client))
        return self._token(user)

    async def revoke(self, payload):
        self.revoked.append(payload)


@pytest.fixture
def fake_sessions():
    return FakeSessionService()


# ---------------------------------------------------------------------------
# Client de base (pas d'overrides)
# ---------------------------------------------------------------------------

@pytest.fixture
async def client(fake_sessions):
    """Client HTTP brut — lifespan DB mockée, seul le service de sessions est remplacé (voir plus haut)."""
    app.dependency_overrides[get_session_service] = lambda: fake_sessions
    with patch("app.core.lifespan.check_reference_data_exists", new_callable=AsyncMock, return_value=True):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            yield c
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Infra tests d'intégration réels (Phase B) — vraie AsyncSession Postgres
#
# Opt-in uniquement : seuls les tests qui demandent real_session déclenchent
# une vraie connexion. La base pointée est une copie de la prod (en local) ou
# une base vide migrée (CI) : chaque test crée ses propres données
# (make_real_test_user, make_real_test_album...), sans dépendre de celles qui
# existent. Chaque test tourne dans une transaction externe + SAVEPOINT
# (join_transaction_mode="create_savepoint"), annulée à la fin. Même les
# session.commit() internes de transaction_context() ne libèrent qu'un
# SAVEPOINT, jamais la transaction externe : rien n'est jamais écrit
# durablement, sauf les données de référence d'une base vide (ensure_reference_data).
# ---------------------------------------------------------------------------

# Read from the environment, or from vinylkeeper_back/.env.test (ignored by git).
# Unset: the real-database tests are skipped, the others still run. The CI sets it to its own database.
REAL_TEST_DATABASE_URL = (
    os.getenv("TEST_DATABASE_URL")
    or dotenv_values(Path(__file__).parents[2] / ".env.test").get("TEST_DATABASE_URL")
)


async def ensure_reference_data(engine) -> None:
    """
    Roles, states, moods... as the API inserts them at startup. Only an empty database (the CI, a fresh
    migration) lacks them: it gets them for good, like a first start of the API. A copy that has them
    gets nothing written.
    """
    async with async_sessionmaker(bind=engine)() as session:
        if not await check_reference_data_exists(session):
            await insert_reference_values(session)


@pytest_asyncio.fixture
async def real_engine():
    """Function-scoped : pytest-asyncio ouvre une event loop par test, et les
    connexions asyncpg ne survivent pas au changement de loop."""
    if not REAL_TEST_DATABASE_URL:
        pytest.skip("TEST_DATABASE_URL not set: real-database test skipped")
    engine = create_async_engine(REAL_TEST_DATABASE_URL)
    await ensure_reference_data(engine)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def real_session(real_engine):
    async with real_engine.connect() as conn:
        await conn.begin()
        session_factory = async_sessionmaker(
            bind=conn, expire_on_commit=False, join_transaction_mode="create_savepoint"
        )
        session = session_factory()
        try:
            yield session
        finally:
            await session.close()
            await conn.rollback()


async def make_real_test_user(session: AsyncSession, **overrides) -> User:
    role_id = overrides.pop("role_id", None)
    if role_id is None:
        role_id = (await session.execute(select(Role.id).limit(1))).scalar_one()
    defaults = dict(
        username=f"itest_{uuid.uuid4().hex[:12]}",
        email=f"itest_{uuid.uuid4().hex[:12]}@example.com",
        password=hash_password("Str0ng!Passw0rd"),
        is_accepted_terms=True,
        is_active=True,
        role_id=role_id,
        user_uuid=uuid.uuid4(),
    )
    defaults.update(overrides)
    user = User(**defaults)
    session.add(user)
    await session.flush()
    # role is lazy="selectin": auto-loaded on SELECT, but not on a freshly
    # constructed+flushed instance. Refresh so callers can read user.role.
    await session.refresh(user, attribute_names=["role"])
    return user


def fresh_numeric_external_id() -> str:
    """12 digits: real Discogs ids are far shorter, so no record of a copy of production is ever reused."""
    return str(random.randint(10**11, 10**12 - 1))


async def discogs_source_id(session: AsyncSession) -> int:
    return (await session.execute(
        select(ExternalSource.id).where(ExternalSource.name == ExternalSourceEnum.DISCOGS.value))).scalar_one()


async def make_real_test_album(session: AsyncSession, **overrides) -> Album:
    """A new Discogs release, so that a test never depends on the records already in the database."""
    values = dict(
        external_album_id=fresh_numeric_external_id(),
        external_source_id=await discogs_source_id(session),
        title=f"itest artist - itest album {uuid.uuid4().hex[:8]}",
        image_url="https://i.discogs.com/itest.jpg",
    )
    values.update(overrides)
    album = Album(**values)
    session.add(album)
    await session.flush()
    return album


async def make_real_test_albums(session: AsyncSession, count: int) -> list[Album]:
    return [await make_real_test_album(session) for _ in range(count)]


async def make_real_test_artist(session: AsyncSession, **overrides) -> Artist:
    values = dict(
        external_artist_id=fresh_numeric_external_id(),
        external_source_id=await discogs_source_id(session),
        title=f"itest artist {uuid.uuid4().hex[:8]}",
    )
    values.update(overrides)
    artist = Artist(**values)
    session.add(artist)
    await session.flush()
    return artist


# ---------------------------------------------------------------------------
# Client authentifié (service + current_user overridés)
# ---------------------------------------------------------------------------

@pytest.fixture
async def auth_client(mock_user, fake_sessions):
    """Client avec user_service mocké et current_user résolu sans DB."""
    mock_service = AsyncMock()
    mock_service.get_user_me = AsyncMock(return_value={
        "username": mock_user.username,
        "user_uuid": str(mock_user.user_uuid),
        "is_admin": False,
        "is_tutorial_seen": False,
        "number_of_connections": 1,
    })
    mock_service.get_user_settings = AsyncMock(return_value={
        "username": mock_user.username,
        "email": mock_user.email,
        "user_uuid": str(mock_user.user_uuid),
        "created_at": None,
        "is_accepted_terms": True,
    })

    async def override_current_user():
        return mock_user

    app.dependency_overrides[get_user_service] = lambda: mock_service
    app.dependency_overrides[get_current_user] = override_current_user
    app.dependency_overrides[get_session_service] = lambda: fake_sessions

    with patch("app.core.lifespan.check_reference_data_exists", new_callable=AsyncMock, return_value=True):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            access_token = create_access_token(str(mock_user.user_uuid))
            c.cookies.set("access_token", access_token)
            yield c, mock_service, mock_user

    app.dependency_overrides.clear()
