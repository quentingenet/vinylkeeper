import os
import pathlib

# Toutes les vars d'env requises AVANT tout import de l'app
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("DATABASE_NAME", "test_db")
os.environ.setdefault("DATABASE_HOST", "localhost")
os.environ.setdefault("DATABASE_PORT", "5432")
os.environ.setdefault("DATABASE_USERNAME", "test_user")
os.environ.setdefault("DATABASE_PASSWORD", "test_password")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test_user:test_password@localhost/test_db")
os.environ.setdefault("DB_POOL_SIZE", "5")
os.environ.setdefault("DB_MAX_OVERFLOW", "10")
os.environ.setdefault("DB_POOL_TIMEOUT", "30")
os.environ.setdefault("DB_POOL_RECYCLE", "1800")
os.environ.setdefault("DB_STATEMENT_TIMEOUT", "30000")
os.environ.setdefault("DB_LOCK_TIMEOUT", "5000")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
os.environ.setdefault("REFRESH_TOKEN_EXPIRE_MINUTES", "10080")
os.environ.setdefault("RESET_TOKEN_EXPIRE_MINUTES", "15")
os.environ.setdefault("ALGORITHM", "RS256")
os.environ.setdefault("COOKIE_DOMAIN", "")
os.environ.setdefault("EMAIL_ADMIN", "admin@test.com")
os.environ.setdefault("SMTP_PORT", "587")
os.environ.setdefault("SMTP_SERVER", "smtp.test.com")
os.environ.setdefault("SMTP_USERNAME", "test_smtp_user")
os.environ.setdefault("SMTP_PASSWORD", "test_smtp_password")
os.environ.setdefault("SMTP_FROM_ADDRESS", "noreply@test.com")
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")
os.environ.setdefault("ALLOWED_ORIGINS", "http://localhost:3000")
os.environ.setdefault("DEFAULT_ROLE_ID", "1")
os.environ.setdefault("DISCOGS_API_URL", "https://api.discogs.com")
os.environ.setdefault("DISCOGS_API_KEY", "test_discogs_key")
os.environ.setdefault("USER_AGENT", "VinylKeeperTest/1.0")

# Génère les clés RSA de test si elles n'existent pas déjà
_KEYS_DIR = pathlib.Path(__file__).parent.parent / "app" / "keys"
_KEYS_DIR.mkdir(parents=True, exist_ok=True)

_PRIVATE_KEY_PATH = _KEYS_DIR / "private_key.pem"
_PUBLIC_KEY_PATH = _KEYS_DIR / "public_key.pem"

if not _PRIVATE_KEY_PATH.exists() or not _PUBLIC_KEY_PATH.exists():
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.hazmat.backends import default_backend

    _key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
        backend=default_backend(),
    )
    _PRIVATE_KEY_PATH.write_bytes(
        _key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        )
    )
    _PUBLIC_KEY_PATH.write_bytes(
        _key.public_key().public_bytes(
            serialization.Encoding.PEM,
            serialization.PublicFormat.SubjectPublicKeyInfo,
        )
    )

# Imports app (après les env vars et les clés)
import pytest
from unittest.mock import AsyncMock, MagicMock

from app.core.security import hash_password
from app.utils.auth_utils.auth import create_token, TokenType


# ---------------------------------------------------------------------------
# Factories partagées entre tous les fichiers de test
# ---------------------------------------------------------------------------

def make_role(name: str = "user") -> MagicMock:
    role = MagicMock()
    role.name = name
    return role


def make_user(
    user_id: int = 1,
    user_uuid: str = "test-uuid-1234-5678",
    role_name: str = "user",
    is_superuser: bool = False,
    is_active: bool = True,
    password: str = "correct_password",
) -> MagicMock:
    user = MagicMock()
    user.id = user_id
    user.user_uuid = user_uuid
    user.is_active = is_active
    user.is_superuser = is_superuser
    user.role = make_role(role_name)
    user.password = hash_password(password)
    return user


def make_user_repo(user: MagicMock = None) -> AsyncMock:
    repo = AsyncMock()
    repo.db = AsyncMock()
    repo.db.in_transaction = MagicMock(return_value=False)
    _begin_cm = MagicMock()
    _begin_cm.__aenter__ = AsyncMock(return_value=None)
    _begin_cm.__aexit__ = AsyncMock(return_value=False)
    repo.db.begin = MagicMock(return_value=_begin_cm)
    repo.db.commit = AsyncMock()
    repo.get_user_by_uuid = AsyncMock(return_value=user)
    repo.get_user_by_id = AsyncMock(return_value=user)
    repo.update_user_password = AsyncMock(return_value=True)
    repo.update_user_last_login = AsyncMock()
    repo.get_user_by_email = AsyncMock(return_value=user)
    repo.is_email_taken = AsyncMock(return_value=False)
    repo.is_username_taken = AsyncMock(return_value=False)
    repo.get_all_users = AsyncMock(return_value=[])
    repo.count_users = AsyncMock(return_value=0)
    repo.delete_user = AsyncMock(return_value=True)
    return repo


# ---------------------------------------------------------------------------
# Fixtures pytest partagées
# ---------------------------------------------------------------------------

@pytest.fixture
def regular_user():
    return make_user(role_name="user")


@pytest.fixture
def admin_user():
    return make_user(role_name="admin", is_superuser=True)


@pytest.fixture
def admin_user_not_superuser():
    return make_user(role_name="admin", is_superuser=False)


@pytest.fixture
def access_token(regular_user):
    return create_token(str(regular_user.user_uuid), TokenType.ACCESS)


@pytest.fixture
def refresh_token_fixture(regular_user):
    return create_token(str(regular_user.user_uuid), TokenType.REFRESH)


@pytest.fixture
def admin_access_token(admin_user):
    return create_token(str(admin_user.user_uuid), TokenType.ACCESS)
