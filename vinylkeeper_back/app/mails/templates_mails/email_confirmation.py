from html import escape

from app.core.config_env import settings


def _confirmation_link(token: str) -> str:
    return f"{settings.FRONTEND_URL.rstrip('/')}/confirm-email?token={token}"


def _expiry() -> str:
    hours = max(1, settings.EMAIL_TOKEN_EXPIRE_MINUTES // 60)
    return f"{hours} hour{'s' if hours > 1 else ''}"


def welcome_template(username: str, token: str) -> str:
    """Registration: welcome the user and ask them to confirm their email"""
    username = escape(username)
    return f"""<!DOCTYPE html>
    <html>
    <body>
        <p>Welcome to Vinyl Keeper, {username}!</p>
        <p>Thanks for joining. Please confirm your email address by clicking the link below:</p>
        <p><a href="{_confirmation_link(token)}">Confirm my email address</a></p>
        <p>This link expires in {_expiry()}. You can ask for a new one from your settings.</p>
        <p>If you did not create a Vinyl Keeper account, please ignore this email.</p>
        <p>Happy digging,<br>The Vinyl Keeper Team</p>
        <br/>
        <p>Not needed to answer to this email.</p>
    </body>
    </html>"""


def email_confirmation_template(username: str, token: str) -> str:
    """A new confirmation link asked from the settings"""
    username = escape(username)
    return f"""<!DOCTYPE html>
    <html>
    <body>
        <p>Hello {username},</p>
        <p>Please confirm your email address by clicking the link below:</p>
        <p><a href="{_confirmation_link(token)}">Confirm my email address</a></p>
        <p>This link expires in {_expiry()}.</p>
        <p>If you did not ask for this email, please ignore it.</p>
        <p>Best regards,<br>The Vinyl Keeper Team</p>
        <br/>
        <p>Not needed to answer to this email.</p>
    </body>
    </html>"""


def email_change_confirmation_template(username: str, new_email: str, token: str) -> str:
    """Sent to the new address: the change is applied only once this link is opened"""
    username, new_email = escape(username), escape(new_email)
    return f"""<!DOCTYPE html>
    <html>
    <body>
        <p>Hello {username},</p>
        <p>You asked to use {new_email} as the email address of your Vinyl Keeper account.
        Please confirm it by clicking the link below:</p>
        <p><a href="{_confirmation_link(token)}">Confirm my new email address</a></p>
        <p>Until then, your current email address stays in use. This link expires in {_expiry()}.</p>
        <p>If you did not ask for this change, please ignore this email.</p>
        <p>Best regards,<br>The Vinyl Keeper Team</p>
        <br/>
        <p>Not needed to answer to this email.</p>
    </body>
    </html>"""


def email_change_notice_template(username: str, new_email: str) -> str:
    """Sent to the current address, so that a change asked from a stolen session does not go unnoticed"""
    username, new_email = escape(username), escape(new_email)
    return f"""<!DOCTYPE html>
    <html>
    <body>
        <p>Hello {username},</p>
        <p>A change of the email address of your Vinyl Keeper account to {new_email} was requested.
        It will only be applied once confirmed from that new address.</p>
        <p>If you did not ask for this change, please reset your password right away:
        this cancels the pending change and signs out every other session.</p>
        <p>Best regards,<br>The Vinyl Keeper Team</p>
        <br/>
        <p>Not needed to answer to this email.</p>
    </body>
    </html>"""
