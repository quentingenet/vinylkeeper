"""
A password being created or changed: 8 characters at least, a letter and a number, anything else allowed.
Never checked at login: accounts made when the minimum was 4 characters keep working.
"""
import pytest
from pydantic import ValidationError

from app.core.security import hash_password, verify_password
from app.schemas.user_schema import (
    PASSWORD_MIN_LENGTH,
    PasswordChangeSchema,
    ResetPasswordSchema,
    UserAuthSchema,
    UserCreate,
)

REGISTRATION = {
    "username": "john", "email": "john@example.org", "is_accepted_terms": True, "timezone": "Europe/Paris",
}


def register(password: str) -> UserCreate:
    return UserCreate.model_validate({**REGISTRATION, "password": password})


def change(password: str) -> PasswordChangeSchema:
    return PasswordChangeSchema(current_password="old1", new_password=password)


def reset(password: str) -> ResetPasswordSchema:
    return ResetPasswordSchema(token="t", new_password=password)


CREATORS = [register, change, reset]


@pytest.fixture(autouse=True)
def no_dns_lookup(monkeypatch):
    """The email check of the registration asks the DNS: not what is tested here."""
    monkeypatch.setattr("app.schemas.user_schema.validate_email", lambda v, check_deliverability=True: type(
        "Validated", (), {"normalized": v})())


def test_the_minimum_is_eight_characters():
    assert PASSWORD_MIN_LENGTH == 8


@pytest.mark.parametrize("create", CREATORS)
class TestNewPassword:
    def test_eight_characters_with_a_letter_and_a_number_are_enough(self, create):
        create("abcdefg1")

    @pytest.mark.parametrize("short", ["abc1", "abcdef1", "1234567"])
    def test_fewer_than_eight_characters_are_refused(self, create, short):
        with pytest.raises(ValidationError, match="at least 8 characters"):
            create(short)

    def test_a_letter_and_a_number_are_still_needed(self, create):
        with pytest.raises(ValidationError, match="at least one letter"):
            create("12345678")
        with pytest.raises(ValidationError, match="at least one number"):
            create("abcdefgh")

    @pytest.mark.parametrize("password", [
        "p@ss w0rd!",          # symbols and a space
        "Été-2026-Ça",         # accents
        "correct horse 9 battery staple",
        "ab1" + "é" * 5,       # accented letters count as letters
    ])
    def test_symbols_spaces_and_accents_are_allowed(self, create, password):
        create(password)

    def test_a_symbol_is_never_required(self, create):
        create("simplepass1")


class TestOlderAccountsKeepWorking:
    def test_the_login_does_not_look_at_the_length(self):
        login = UserAuthSchema(email="john@example.org", password="ab1")
        assert login.password == "ab1"

    def test_a_four_character_password_still_verifies(self):
        hashed = hash_password("ab12")
        assert verify_password(hashed, "ab12") is True
        assert verify_password(hashed, "ab13") is False

    def test_the_current_password_of_a_change_is_not_held_to_the_new_rule(self):
        # Changing a four-character password is how an account leaves it: the old one must be accepted as typed
        assert PasswordChangeSchema(current_password="ab12", new_password="abcdefg1").current_password == "ab12"
