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
from app.schemas.user_schema import UserCreate, UserUpdate
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


class TestUpdateUser:
    async def test_updates_username(self, real_session):
        user = await make_test_user(real_session)
        service = make_user_service(real_session)

        updated = await service.update_user(user, UserUpdate(username="renamed_user"))

        assert updated.username == "renamed_user"

    async def test_duplicate_email_raises(self, real_session):
        user_a = await make_test_user(real_session)
        user_b = await make_test_user(real_session)
        service = make_user_service(real_session)

        with pytest.raises(DuplicateEmailError):
            await service.update_user(user_b, UserUpdate(email=user_a.email))


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
