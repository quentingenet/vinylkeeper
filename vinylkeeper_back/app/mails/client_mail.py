from enum import Enum
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from smtplib import SMTP_SSL
from app.core.logging import logger
from app.mails.templates_mails.new_user import new_user_register_template
from app.mails.templates_mails.reset_password import reset_password_template
from app.mails.templates_mails.contact_message import contact_message_template
from app.mails.templates_mails.new_atlas_spot import new_atlas_spot_template
from app.mails.templates_mails.place_report import place_report_template
from app.mails.templates_mails.email_confirmation import (
    welcome_template,
    email_confirmation_template,
    email_change_confirmation_template,
    email_change_notice_template,
)
from app.core.config_env import settings
import asyncio

SMTP_TIMEOUT_SECONDS = 10


class MailSubject(Enum):
    PasswordReset = "Password reset"
    NewUserRegistered = "New user registered"
    ContactMessage = "Contact message from VinylKeeper user"
    NewAtlasSpot = "New Atlas spot requires moderation"
    AtlasSpotReported = "Atlas spot reported as wrong"
    Welcome = "Welcome to Vinyl Keeper, please confirm your email"
    EmailConfirmation = "Confirm your email address"
    EmailChangeConfirmation = "Confirm your new email address"
    EmailChangeNotice = "Email change requested on your Vinyl Keeper account"


def smtp_client():
    smtp_server = settings.SMTP_SERVER
    smtp_username = settings.SMTP_USERNAME
    smtp_password = settings.SMTP_PASSWORD

    if not smtp_server or not smtp_username or not smtp_password:
        raise EnvironmentError(
            "SMTP_SERVER, SMTP_USERNAME, and SMTP_PASSWORD must be set")

    # Without a timeout, an unresponsive SMTP server blocks the worker thread forever
    server = SMTP_SSL(smtp_server, timeout=SMTP_TIMEOUT_SECONDS)
    server.login(smtp_username, smtp_password)
    return server


def get_template(subject: MailSubject, **kwargs) -> str:
    templates = {
        MailSubject.NewUserRegistered: new_user_register_template,
        MailSubject.PasswordReset: reset_password_template,
        MailSubject.ContactMessage: contact_message_template,
        MailSubject.NewAtlasSpot: new_atlas_spot_template,
        MailSubject.AtlasSpotReported: place_report_template,
        MailSubject.Welcome: welcome_template,
        MailSubject.EmailConfirmation: email_confirmation_template,
        MailSubject.EmailChangeConfirmation: email_change_confirmation_template,
        MailSubject.EmailChangeNotice: email_change_notice_template,
    }
    template_function = templates.get(subject)
    if template_function:
        return template_function(**kwargs)
    raise ValueError("No template found for the given subject")


async def send_mail(to: str, subject: MailSubject, **kwargs):
    try:
        # Create message in main thread
        msg = MIMEMultipart()
        msg['From'] = settings.SMTP_FROM_ADDRESS
        msg['To'] = to
        msg['Subject'] = subject.value
        template = get_template(subject, **kwargs)
        msg.attach(MIMEText(template, 'html'))

        # Execute SMTP operations in thread pool to avoid blocking event loop
        await asyncio.to_thread(_send_mail_sync, to, msg)
        # Recipient left out: no email addresses in the logs
        logger.info(f"{subject.value} - mail sent with success")
    except Exception as e:
        logger.error(f"{subject.value} - Error sending mail: {e}")
        return False
    return True


def _send_mail_sync(to: str, msg: MIMEMultipart):
    """Synchronous helper function to send mail"""
    server = smtp_client()
    try:
        server.sendmail(settings.SMTP_FROM_ADDRESS, to, msg.as_string())
    finally:
        server.quit()
