"""
No full email address, nor any database parameter (email, password hash), reaches the logs.
"""
import logging
import smtplib
from unittest.mock import patch

import pytest

from app.db.session import engine
from app.mails.client_mail import MailSubject, send_mail
from app.models.user_model import User


@pytest.fixture
def app_log(caplog):
    """The "app" logger does not propagate to the root logger: caplog must listen to it directly."""
    app_logger = logging.getLogger("app")
    app_logger.addHandler(caplog.handler)
    caplog.set_level(logging.INFO, logger="app")
    yield caplog
    app_logger.removeHandler(caplog.handler)


async def test_refused_recipient_is_masked_in_the_mail_error_log(app_log):
    refused = smtplib.SMTPRecipientsRefused({"john@example.fr": (550, b"No such user")})
    with patch("app.mails.client_mail._send_mail_sync", side_effect=refused):
        sent = await send_mail(to="john@example.fr", subject=MailSubject.PasswordReset, token="t")

    assert sent is False
    assert "Error sending mail" in app_log.text
    assert "john@***" in app_log.text
    assert "example.fr" not in app_log.text


def test_database_errors_hide_the_query_parameters():
    # A failed INSERT INTO users would otherwise print the email and the password hash
    assert engine.sync_engine.hide_parameters is True


def test_user_repr_has_no_email():
    user = User(username="john", email="john@example.fr")
    assert "john" in repr(user)
    assert "john@example.fr" not in repr(user)
