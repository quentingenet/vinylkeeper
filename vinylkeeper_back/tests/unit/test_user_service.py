import pytest
from unittest.mock import AsyncMock, patch

from app.services.user_service import UserService
from app.schemas.user_schema import UserCreate
from app.core.exceptions import (
    DuplicateEmailError,
    DuplicateUsernameError,
    InvalidCredentialsError,
    InvalidResetTokenError,
    PasswordUpdateError,
    UserNotFoundError,
    ValidationError,
    InvalidEmailTokenError,
    ServerError,
)
from app.utils.auth_utils.auth import (
    create_email_change_token,
    create_email_confirmation_token,
    create_reset_token,
)

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
        with pytest.raises(InvalidCredentialsError):
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

    async def test_role_is_the_user_role_looked_up_by_name(self, regular_user):
        service, repo, _ = make_service(regular_user)
        repo.get_role_id_by_name = AsyncMock(return_value=7)
        repo.create_user = AsyncMock(return_value=regular_user)

        await service.create_user(make_user_data())

        repo.get_role_id_by_name.assert_awaited_once_with("user")
        assert repo.create_user.await_args.args[0].role_id == 7

    def test_role_id_is_not_a_registration_field(self):
        # A role_id sent at registration is dropped by the schema: it cannot reach the service
        assert "role_id" not in UserCreate.model_fields

    async def test_missing_user_role_raises_server_error(self, regular_user):
        service, repo, _ = make_service(regular_user)
        repo.get_role_id_by_name = AsyncMock(return_value=None)

        with pytest.raises(ServerError):
            await service.create_user(make_user_data())

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

    async def test_success_bumps_the_token_version(self, regular_user):
        service, repo, _ = make_service(regular_user)
        token = create_reset_token(str(regular_user.user_uuid), 0)

        await service.reset_password(token, "NewPass1")

        assert repo.update_user_password.await_args.args[2] == 1
        assert regular_user.token_version == 1

    async def test_used_link_raises(self, regular_user):
        service, repo, _ = make_service(regular_user)
        token = create_reset_token(str(regular_user.user_uuid), 0)
        regular_user.token_version = 1  # the link was already used

        with pytest.raises(InvalidResetTokenError):
            await service.reset_password(token, "NewPass1")
        repo.update_user_password.assert_not_awaited()

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
        assert repo.update_user_password.await_args.args[2] == 1
        assert regular_user.token_version == 1

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

class TestRequestEmailChange:
    async def test_wrong_password_raises_400_not_401(self, regular_user):
        service, repo, _ = make_service(regular_user)
        regular_user.email = "old@example.com"

        with patch("app.services.user_service.send_mail", new_callable=AsyncMock) as send_mail:
            with pytest.raises(ValidationError) as exc:
                await service.request_email_change(regular_user, "new@example.com", "wrong_password")
        # A 401 would make the frontend refresh the session and report it expired
        assert exc.value.status_code == 400
        send_mail.assert_not_awaited()

    async def test_same_email_raises(self, regular_user):
        service, _, _ = make_service(regular_user)
        regular_user.email = "same@example.com"

        with pytest.raises(ValidationError):
            await service.request_email_change(regular_user, "same@example.com", "correct_password")

    async def test_taken_email_raises(self, regular_user):
        service, repo, _ = make_service(regular_user)
        regular_user.email = "old@example.com"
        repo.is_email_taken = AsyncMock(return_value=True)

        with pytest.raises(DuplicateEmailError):
            await service.request_email_change(regular_user, "taken@example.com", "correct_password")

    async def test_sends_link_to_new_address_and_notice_to_current_one(self, regular_user):
        service, repo, _ = make_service(regular_user)
        regular_user.email = "old@example.com"
        regular_user.username = "alice"

        with patch("app.services.user_service.send_mail", new_callable=AsyncMock, return_value=True) as send_mail:
            await service.request_email_change(regular_user, "new@example.com", "correct_password")

        recipients = [call.kwargs["to"] for call in send_mail.await_args_list]
        assert recipients == ["new@example.com", "old@example.com"]
        # Nothing changes before the link is opened
        assert regular_user.email == "old@example.com"
        repo.change_email.assert_not_awaited()

    async def test_unsent_confirmation_raises(self, regular_user):
        service, _, _ = make_service(regular_user)
        regular_user.email = "old@example.com"
        regular_user.username = "alice"

        with patch("app.services.user_service.send_mail", new_callable=AsyncMock, return_value=False):
            with pytest.raises(ServerError):
                await service.request_email_change(regular_user, "new@example.com", "correct_password")


class TestConfirmEmail:
    async def test_registration_link_confirms_the_email(self, regular_user):
        service, repo, _ = make_service(regular_user)
        regular_user.email = "a@example.com"
        token = create_email_confirmation_token(regular_user.user_uuid, "a@example.com")

        assert await service.confirm_email(token) == "a@example.com"
        repo.confirm_email.assert_awaited_once_with(regular_user.id, "a@example.com")

    async def test_registration_link_of_a_previous_email_is_refused(self, regular_user):
        service, repo, _ = make_service(regular_user)
        regular_user.email = "now@example.com"
        token = create_email_confirmation_token(regular_user.user_uuid, "before@example.com")

        with pytest.raises(InvalidEmailTokenError):
            await service.confirm_email(token)
        repo.confirm_email.assert_not_awaited()

    async def test_change_link_replaces_the_email(self, regular_user):
        service, repo, _ = make_service(regular_user)
        regular_user.email = "old@example.com"
        token = create_email_change_token(regular_user.user_uuid, "old@example.com", "new@example.com", 0)

        assert await service.confirm_email(token) == "new@example.com"
        repo.change_email.assert_awaited_once_with(regular_user.id, "old@example.com", "new@example.com")

    async def test_change_link_opened_twice_succeeds(self, regular_user):
        service, repo, _ = make_service(regular_user)
        regular_user.email = "new@example.com"
        token = create_email_change_token(regular_user.user_uuid, "old@example.com", "new@example.com", 0)

        assert await service.confirm_email(token) == "new@example.com"
        repo.change_email.assert_not_awaited()

    async def test_change_link_is_cancelled_by_a_password_reset(self, regular_user):
        service, repo, _ = make_service(regular_user)
        regular_user.email = "old@example.com"
        token = create_email_change_token(regular_user.user_uuid, "old@example.com", "new@example.com", 0)
        regular_user.token_version = 1

        with pytest.raises(InvalidEmailTokenError):
            await service.confirm_email(token)
        repo.change_email.assert_not_awaited()

    async def test_change_link_to_an_address_taken_meanwhile_raises(self, regular_user):
        service, repo, _ = make_service(regular_user)
        regular_user.email = "old@example.com"
        repo.is_email_taken = AsyncMock(return_value=True)
        token = create_email_change_token(regular_user.user_uuid, "old@example.com", "new@example.com", 0)

        with pytest.raises(DuplicateEmailError):
            await service.confirm_email(token)

    @pytest.mark.parametrize("token", ["garbage", create_reset_token("test-uuid-1234-5678", 0)])
    async def test_other_tokens_are_refused(self, regular_user, token):
        service, _, _ = make_service(regular_user)

        with pytest.raises(InvalidEmailTokenError) as exc:
            await service.confirm_email(token)
        assert exc.value.status_code == 400


class TestEmailConfirmationMails:
    async def test_resend_when_already_confirmed_sends_nothing(self, regular_user):
        service, _, _ = make_service(regular_user)
        regular_user.is_email_confirmed = True

        with patch("app.services.user_service.send_mail", new_callable=AsyncMock) as send_mail:
            assert await service.resend_email_confirmation(regular_user) is False
        send_mail.assert_not_awaited()

    async def test_resend_sends_a_link(self, regular_user):
        service, _, _ = make_service(regular_user)
        regular_user.email = "a@example.com"
        regular_user.username = "alice"

        with patch("app.services.user_service.send_mail", new_callable=AsyncMock, return_value=True) as send_mail:
            assert await service.resend_email_confirmation(regular_user) is True
        assert send_mail.await_args.kwargs["to"] == "a@example.com"

    async def test_welcome_email_never_raises(self, regular_user):
        service, _, _ = make_service(regular_user)
        regular_user.email = "a@example.com"
        regular_user.username = "alice"

        with patch("app.services.user_service.send_mail", new_callable=AsyncMock, side_effect=Exception("SMTP down")):
            await service.send_welcome_email(regular_user)


class TestEmailTemplates:
    def test_welcome_mentions_the_username_escaped_and_the_link(self):
        from app.mails.templates_mails.email_confirmation import welcome_template

        html = welcome_template(username="<b>alice</b>", token="tok123")
        assert "Welcome to Vinyl Keeper, &lt;b&gt;alice&lt;/b&gt;!" in html
        assert "/confirm-email?token=tok123" in html
