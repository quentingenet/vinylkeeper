import pytest
from unittest.mock import AsyncMock, patch

from app.services.user_service import UserService
from app.schemas.user_schema import UserCreate
from app.core.exceptions import (
    DuplicateEmailError,
    DuplicateUsernameError,
    EmailNotFoundError,
    InvalidCredentialsError,
    InvalidResetTokenError,
    PasswordUpdateError,
    UserNotFoundError,
)
from app.utils.auth_utils.auth import create_reset_token

from tests.conftest import make_user_repo


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_user_data(**overrides) -> UserCreate:
    """UserCreate sans validation DNS (model_construct bypasse les field_validators)."""
    defaults = dict(
        username="testuser",
        email="test@example.com",
        password="Test1234",
        is_accepted_terms=True,
        role_id=2,
        timezone="Europe/Paris",
    )
    return UserCreate.model_construct(**{**defaults, **overrides})


def make_service(user=None, **repo_overrides):
    repo = make_user_repo(user)
    for attr, value in repo_overrides.items():
        setattr(repo, attr, value)
    collection_service = AsyncMock()
    collection_service.create_collection = AsyncMock()
    return UserService(repository=repo, collection_service=collection_service), repo, collection_service


# ---------------------------------------------------------------------------
# authenticate()
# ---------------------------------------------------------------------------

class TestAuthenticate:
    async def test_success_returns_user(self, regular_user):
        service, repo, _ = make_service(regular_user)
        result = await service.authenticate("test@example.com", "correct_password")
        assert result is regular_user

    async def test_increments_connection_count(self, regular_user):
        regular_user.number_of_connections = 0
        service, _, _ = make_service(regular_user)
        await service.authenticate("test@example.com", "correct_password")
        assert regular_user.number_of_connections == 1

    async def test_updates_last_login(self, regular_user):
        service, repo, _ = make_service(regular_user)
        await service.authenticate("test@example.com", "correct_password")
        repo.update_user_last_login.assert_awaited_once_with(regular_user)

    async def test_unknown_email_raises(self):
        service, repo, _ = make_service(user=None)
        repo.get_user_by_email = AsyncMock(return_value=None)
        with pytest.raises(EmailNotFoundError):
            await service.authenticate("ghost@example.com", "password")

    async def test_wrong_password_raises(self, regular_user):
        service, _, _ = make_service(regular_user)
        with pytest.raises(InvalidCredentialsError):
            await service.authenticate("test@example.com", "wrong_password")


# ---------------------------------------------------------------------------
# create_user()
# ---------------------------------------------------------------------------

class TestCreateUser:
    async def test_success_creates_user_and_collection(self, regular_user):
        service, repo, collection_service = make_service(regular_user)
        repo.create_user = AsyncMock(return_value=regular_user)

        result = await service.create_user(make_user_data())

        repo.create_user.assert_awaited_once()
        collection_service.create_collection.assert_awaited_once()
        assert result is regular_user

    async def test_sets_initial_connection_count(self, regular_user):
        service, repo, _ = make_service(regular_user)
        repo.create_user = AsyncMock(return_value=regular_user)

        result = await service.create_user(make_user_data())
        assert result.number_of_connections == 1

    async def test_duplicate_email_raises(self):
        service, repo, _ = make_service()
        repo.is_email_taken = AsyncMock(return_value=True)
        with pytest.raises(DuplicateEmailError):
            await service.create_user(make_user_data())

    async def test_duplicate_username_raises(self):
        service, repo, _ = make_service()
        repo.is_email_taken = AsyncMock(return_value=False)
        repo.is_username_taken = AsyncMock(return_value=True)
        with pytest.raises(DuplicateUsernameError):
            await service.create_user(make_user_data())

    async def test_collection_failure_propagates(self, regular_user):
        """Si create_collection lève, l'exception remonte — rollback implicite de la transaction."""
        service, repo, collection_service = make_service(regular_user)
        repo.create_user = AsyncMock(return_value=regular_user)
        collection_service.create_collection = AsyncMock(side_effect=Exception("DB error"))

        with pytest.raises(Exception, match="DB error"):
            await service.create_user(make_user_data())


# ---------------------------------------------------------------------------
# send_password_reset_email()
# ---------------------------------------------------------------------------

class TestSendPasswordResetEmail:
    async def test_unknown_email_returns_silently(self):
        """Anti-énumération : aucune exception si l'email n'existe pas."""
        service, repo, _ = make_service(user=None)
        repo.get_user_by_email = AsyncMock(return_value=None)
        await service.send_password_reset_email("ghost@example.com")

    async def test_sends_mail_when_user_exists(self, regular_user):
        service, _, _ = make_service(regular_user)
        with patch("app.services.user_service.send_mail", new_callable=AsyncMock, return_value=True) as mock_mail:
            await service.send_password_reset_email("test@example.com")
            mock_mail.assert_awaited_once()

    async def test_smtp_failure_does_not_raise(self, regular_user):
        """Échec SMTP : on logue, on ne plante pas."""
        service, _, _ = make_service(regular_user)
        with patch("app.services.user_service.send_mail", new_callable=AsyncMock, return_value=False):
            await service.send_password_reset_email("test@example.com")


# ---------------------------------------------------------------------------
# reset_password()
# ---------------------------------------------------------------------------

class TestResetPassword:
    async def test_success(self, regular_user):
        service, repo, _ = make_service(regular_user)
        token = create_reset_token(str(regular_user.user_uuid))

        await service.reset_password(token, "NewPass1")
        repo.update_user_password.assert_awaited_once()

    async def test_invalid_token_raises(self):
        service, _, _ = make_service()
        with pytest.raises(InvalidResetTokenError):
            await service.reset_password("garbage-token", "NewPass1")

    async def test_user_not_found_raises(self, regular_user):
        service, repo, _ = make_service(regular_user)
        repo.get_user_by_uuid = AsyncMock(return_value=None)
        token = create_reset_token(str(regular_user.user_uuid))

        with pytest.raises(UserNotFoundError):
            await service.reset_password(token, "NewPass1")

    async def test_db_update_failure_raises(self, regular_user):
        service, repo, _ = make_service(regular_user)
        repo.update_user_password = AsyncMock(return_value=False)
        token = create_reset_token(str(regular_user.user_uuid))

        with pytest.raises(PasswordUpdateError):
            await service.reset_password(token, "NewPass1")


# ---------------------------------------------------------------------------
# change_password()
# ---------------------------------------------------------------------------

class TestChangePassword:
    async def test_success(self, regular_user):
        service, repo, _ = make_service(regular_user)
        await service.change_password(regular_user, "correct_password", "NewPass1")
        repo.update_user_password.assert_awaited_once()

    async def test_wrong_current_password_raises(self, regular_user):
        service, _, _ = make_service(regular_user)
        with pytest.raises(InvalidCredentialsError):
            await service.change_password(regular_user, "wrong_password", "NewPass1")

    async def test_db_update_failure_raises(self, regular_user):
        service, repo, _ = make_service(regular_user)
        repo.update_user_password = AsyncMock(return_value=False)
        with pytest.raises(PasswordUpdateError):
            await service.change_password(regular_user, "correct_password", "NewPass1")


# ---------------------------------------------------------------------------
# get_user_me()
# ---------------------------------------------------------------------------

class TestGetUserMe:
    async def test_admin_superuser_is_admin(self, admin_user):
        admin_user.number_of_connections = 5
        service, _, _ = make_service(admin_user)
        result = await service.get_user_me(admin_user)
        assert result["is_admin"] is True

    async def test_regular_user_is_not_admin(self, regular_user):
        regular_user.number_of_connections = 1
        service, _, _ = make_service(regular_user)
        result = await service.get_user_me(regular_user)
        assert result["is_admin"] is False

    async def test_admin_role_without_superuser_is_not_admin(self, admin_user_not_superuser):
        admin_user_not_superuser.number_of_connections = 1
        service, _, _ = make_service(admin_user_not_superuser)
        result = await service.get_user_me(admin_user_not_superuser)
        assert result["is_admin"] is False

    async def test_tutorial_seen_after_two_connections(self, regular_user):
        regular_user.number_of_connections = 3
        service, _, _ = make_service(regular_user)
        result = await service.get_user_me(regular_user)
        assert result["is_tutorial_seen"] is True

    async def test_tutorial_not_seen_on_first_login(self, regular_user):
        regular_user.number_of_connections = 1
        service, _, _ = make_service(regular_user)
        result = await service.get_user_me(regular_user)
        assert result["is_tutorial_seen"] is False


# ---------------------------------------------------------------------------
# update_user()
# ---------------------------------------------------------------------------

class TestUpdateUser:
    async def test_success(self, regular_user):
        service, repo, _ = make_service(regular_user)
        repo.update_user = AsyncMock(return_value=regular_user)
        user_data = UserCreate.model_construct(email=None, username="newname", timezone=None)

        result = await service.update_user(regular_user, user_data)
        assert result is regular_user

    async def test_new_email_already_taken_raises(self, regular_user):
        service, repo, _ = make_service(regular_user)
        regular_user.email = "old@example.com"
        repo.is_email_taken = AsyncMock(return_value=True)
        user_data = UserCreate.model_construct(email="taken@example.com", username=None, timezone=None)

        with pytest.raises(DuplicateEmailError):
            await service.update_user(regular_user, user_data)

    async def test_same_email_skips_uniqueness_check(self, regular_user):
        service, repo, _ = make_service(regular_user)
        regular_user.email = "same@example.com"
        repo.update_user = AsyncMock(return_value=regular_user)
        user_data = UserCreate.model_construct(email="same@example.com", username=None, timezone=None)

        await service.update_user(regular_user, user_data)
        repo.is_email_taken.assert_not_awaited()

    async def test_new_username_already_taken_raises(self, regular_user):
        service, repo, _ = make_service(regular_user)
        regular_user.username = "oldname"
        repo.is_username_taken = AsyncMock(return_value=True)
        user_data = UserCreate.model_construct(email=None, username="taken", timezone=None)

        with pytest.raises(DuplicateUsernameError):
            await service.update_user(regular_user, user_data)
