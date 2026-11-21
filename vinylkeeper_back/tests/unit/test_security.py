"""The password check of an email that has no account (login without timing difference)."""
from unittest.mock import patch

from app.core import security
from app.core.security import _unknown_account_hash, verify_unknown_account_password


async def test_it_runs_a_real_argon2_check_and_never_raises():
    with patch.object(security, "verify_password", wraps=security.verify_password) as check:
        assert await verify_unknown_account_password("any password") is None
    check.assert_called_once_with(_unknown_account_hash(), "any password")


def test_the_hash_is_made_once_and_is_argon2():
    assert _unknown_account_hash() is _unknown_account_hash()
    assert _unknown_account_hash().startswith("$argon2")
