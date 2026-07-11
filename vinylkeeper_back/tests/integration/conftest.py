import uuid
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, ASGITransport
from email_validator import EmailNotValidError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.main import app
from app.deps.deps import get_user_service
from app.utils.auth_utils.auth import get_current_user, create_token, TokenType
from app.core.security import hash_password
from app.models.user_model import User
from app.models.reference_data.roles import Role
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
# Client de base (pas d'overrides)
# ---------------------------------------------------------------------------

@pytest.fixture
async def client():
    """Client HTTP brut — lifespan DB mockée, aucun override de dépendance."""
    with patch("app.core.lifespan.check_reference_data_exists", new_callable=AsyncMock, return_value=True):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            yield c
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Infra tests d'intégration réels (Phase B) — vraie AsyncSession Postgres
#
# Opt-in uniquement : seuls les tests qui demandent real_session déclenchent
# une vraie connexion. La base pointée contient une copie des données de
# prod — chaque test tourne dans une transaction externe + SAVEPOINT
# (join_transaction_mode="create_savepoint"), annulée à la fin. Même les
# session.commit() internes de transaction_context() ne libèrent qu'un
# SAVEPOINT, jamais la transaction externe : rien n'est jamais écrit
# durablement.
# ---------------------------------------------------------------------------

REAL_TEST_DATABASE_URL = "postgresql+asyncpg://testeur:ton_mot_de_passe_ici@localhost:5432/vinylkeeper_db"


@pytest_asyncio.fixture
async def real_engine():
    """Function-scoped : pytest-asyncio ouvre une event loop par test, et les
    connexions asyncpg ne survivent pas au changement de loop."""
    engine = create_async_engine(REAL_TEST_DATABASE_URL)
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


# ---------------------------------------------------------------------------
# Client authentifié (service + current_user overridés)
# ---------------------------------------------------------------------------

@pytest.fixture
async def auth_client(mock_user):
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

    with patch("app.core.lifespan.check_reference_data_exists", new_callable=AsyncMock, return_value=True):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            access_token = create_token(str(mock_user.user_uuid), TokenType.ACCESS)
            c.cookies.set("access_token", access_token)
            yield c, mock_service, mock_user

    app.dependency_overrides.clear()
