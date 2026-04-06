import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, ASGITransport
from email_validator import EmailNotValidError

from app.main import app
from app.deps.deps import get_user_service
from app.utils.auth_utils.auth import get_current_user, create_token, TokenType
from app.core.security import hash_password

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
