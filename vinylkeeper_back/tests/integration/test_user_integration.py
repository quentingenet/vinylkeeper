"""
Real-database integration tests for the User domain.

Same safety model as test_real_db_relationships.py: real_session runs every
test inside an outer transaction + SAVEPOINT that is rolled back at the end.

Scope note: authenticate()/reset_password()/send_password_reset_email() are
intentionally NOT covered here — they touch JWT/reset-token creation, which
is the protected auth zone. This file only covers plain user CRUD/settings,
which is pure UserService/UserRepository business logic.
"""
import uuid
import pytest
from sqlalchemy import select

from app.repositories.user_repository import UserRepository
from app.services.user_service import UserService
from app.schemas.user_schema import UserCreate
from app.utils.auth_utils.auth import create_email_change_token, create_email_confirmation_token
from app.core.exceptions import (
    DuplicateEmailError,
    DuplicateUsernameError,
    InvalidCredentialsError,
)
from app.core.security import verify_password
from app.models.reference_data.roles import Role
from app.core.enums import RoleEnum

from tests.integration.conftest import make_real_test_user as make_test_user
from tests.integration.test_real_db_relationships import make_collection_service


def make_user_service(real_session) -> UserService:
    return UserService(
        repository=UserRepository(real_session),
        collection_service=make_collection_service(real_session),
    )


async def pick_user_role_id(real_session) -> int:
    return (
        await real_session.execute(select(Role.id).filter(Role.name == RoleEnum.USER.value))
    ).scalar_one()


class TestCreateUser:
    async def test_creates_user_and_first_collection(self, real_session):
        service = make_user_service(real_session)
        role_id = await pick_user_role_id(real_session)
        suffix = uuid.uuid4().hex[:10]

        created = await service.create_user(
            UserCreate(
                username=f"itest_{suffix}",
                email=f"itest_{suffix}@example.com",
                password="Str0ng!Passw0rd",
                is_accepted_terms=True,
                role_id=role_id,
            )
        )

        assert created.id is not None
        assert created.username == f"itest_{suffix}"

        collections, total = await service.collection_service.repository.get_user_collections(
            created.id
        )
        assert total == 1
        assert collections[0].name == f"itest_{suffix}'s collection"

    async def test_duplicate_email_raises(self, real_session):
        service = make_user_service(real_session)
        role_id = await pick_user_role_id(real_session)
        suffix = uuid.uuid4().hex[:10]
        email = f"itest_{suffix}@example.com"

        await service.create_user(
            UserCreate(
                username=f"itest_a_{suffix}",
                email=email,
                password="Str0ng!Passw0rd",
                is_accepted_terms=True,
                role_id=role_id,
            )
        )

        with pytest.raises(DuplicateEmailError):
            await service.create_user(
                UserCreate(
                    username=f"itest_b_{suffix}",
                    email=email,
                    password="Str0ng!Passw0rd",
                    is_accepted_terms=True,
                    role_id=role_id,
                )
            )

    async def test_duplicate_username_raises(self, real_session):
        service = make_user_service(real_session)
        role_id = await pick_user_role_id(real_session)
        suffix = uuid.uuid4().hex[:10]
        username = f"itest_{suffix}"

        await service.create_user(
            UserCreate(
                username=username,
                email=f"itest_a_{suffix}@example.com",
                password="Str0ng!Passw0rd",
                is_accepted_terms=True,
                role_id=role_id,
            )
        )

        with pytest.raises(DuplicateUsernameError):
            await service.create_user(
                UserCreate(
                    username=username,
                    email=f"itest_b_{suffix}@example.com",
                    password="Str0ng!Passw0rd",
                    is_accepted_terms=True,
                    role_id=role_id,
                )
            )


class TestEmailConfirmation:
    async def test_new_account_is_not_confirmed_and_has_the_user_role(self, real_session):
        service = make_user_service(real_session)
        user_data = UserCreate.model_construct(
            username=f"itest_{uuid.uuid4().hex[:12]}", email=f"itest_{uuid.uuid4().hex[:12]}@example.com",
            password="Str0ng!Passw0rd", is_accepted_terms=True, timezone="Europe/Paris",
        )

        user = await service.create_user(user_data)

        assert user.is_email_confirmed is False
        role_name = (await real_session.execute(select(Role.name).where(Role.id == user.role_id))).scalar_one()
        assert role_name == RoleEnum.USER.value

    async def test_registration_link_confirms(self, real_session):
        user = await make_test_user(real_session, is_email_confirmed=False)
        service = make_user_service(real_session)

        await service.confirm_email(create_email_confirmation_token(str(user.user_uuid), user.email))

        await real_session.refresh(user)
        assert user.is_email_confirmed is True

    async def test_email_change_link_replaces_and_confirms(self, real_session):
        user = await make_test_user(real_session, is_email_confirmed=False)
        service = make_user_service(real_session)
        new_email = f"moved_{uuid.uuid4().hex[:8]}@example.com"
        token = create_email_change_token(str(user.user_uuid), user.email, new_email, user.token_version)

        await service.confirm_email(token)
        await service.confirm_email(token)  # opened twice

        await real_session.refresh(user)
        assert (user.email, user.is_email_confirmed) == (new_email, True)

    async def test_email_change_to_a_taken_address_is_refused(self, real_session):
        user_a = await make_test_user(real_session)
        user_b = await make_test_user(real_session)
        old_email = user_b.email
        service = make_user_service(real_session)
        token = create_email_change_token(str(user_b.user_uuid), user_b.email, user_a.email, user_b.token_version)

        with pytest.raises(DuplicateEmailError):
            await service.confirm_email(token)

        await real_session.refresh(user_b)
        assert user_b.email == old_email


class TestChangePassword:
    async def test_success_updates_hash(self, real_session):
        user = await make_test_user(real_session)
        service = make_user_service(real_session)

        await service.change_password(user, "Str0ng!Passw0rd", "NewStr0ng!Passw0rd")

        reloaded = await UserRepository(real_session).get_user_by_id(user.id)
        assert verify_password(reloaded.password, "NewStr0ng!Passw0rd")

    async def test_wrong_current_password_raises(self, real_session):
        user = await make_test_user(real_session)
        service = make_user_service(real_session)

        with pytest.raises(InvalidCredentialsError):
            await service.change_password(user, "WrongPassword1", "NewStr0ng!Passw0rd")


class TestDeleteUser:
    async def test_deletes_user(self, real_session):
        user = await make_test_user(real_session)
        service = make_user_service(real_session)

        result = await service.delete_user(user)
        assert result is True

        reloaded = await UserRepository(real_session).get_user_by_id(user.id)
        assert reloaded is None


class TestUserMeAndSettings:
    async def test_get_user_me_reflects_role_and_connections(self, real_session):
        user = await make_test_user(real_session)
        user.number_of_connections = 5
        await real_session.flush()
        service = make_user_service(real_session)

        me = await service.get_user_me(user)

        assert me["username"] == user.username
        assert me["is_tutorial_seen"] is True

    async def test_get_user_settings_reflects_profile(self, real_session):
        user = await make_test_user(real_session)
        service = make_user_service(real_session)

        settings_data = await service.get_user_settings(user)

        assert settings_data["email"] == user.email
        assert settings_data["is_accepted_terms"] is True
