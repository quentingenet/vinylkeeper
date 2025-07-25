from enum import Enum
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from smtplib import SMTP_SSL
from app.core.logging import logger
from app.mails.templates_mails.new_user import new_user_register_template
from app.mails.templates_mails.reset_password import reset_password_template
from app.mails.templates_mails.contact_message import contact_message_template
from app.mails.templates_mails.new_place_suggestion import new_place_suggestion_template
from app.core.config_env import settings
import asyncio

class MailSubject(Enum):
    PasswordReset = "Password reset"
    NewUserRegistered = "New user registered"
    ContactMessage = "Contact message from VinylKeeper user"
    NewPlaceSuggestion = "New place suggestion requires moderation"


def smtp_client():
    smtp_server = settings.SMTP_SERVER
    smtp_username = settings.SMTP_USERNAME
    smtp_password = settings.SMTP_PASSWORD

    if not smtp_server or not smtp_username or not smtp_password:
        raise EnvironmentError(
            "SMTP_SERVER, SMTP_USERNAME, and SMTP_PASSWORD must be set")

    server = SMTP_SSL(smtp_server)
    server.login(smtp_username, smtp_password)
    return server


def get_template(subject: MailSubject, **kwargs) -> str:
    templates = {
        MailSubject.NewUserRegistered: new_user_register_template,
        MailSubject.PasswordReset: reset_password_template,
        MailSubject.ContactMessage: contact_message_template,
        MailSubject.NewPlaceSuggestion: new_place_suggestion_template,
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
        logger.info(f"{subject.value} - mail sent with success to {to}")
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



