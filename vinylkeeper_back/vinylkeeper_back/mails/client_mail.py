from enum import Enum
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from smtplib import SMTP_SSL
from vinylkeeper_back.core.logging import logger
from vinylkeeper_back.mails.templates_mails.new_user import new_user_register_template
from vinylkeeper_back.mails.templates_mails.reset_password import reset_password_template
from vinylkeeper_back.core.config_env import Settings

class MailSubject(Enum):
    PasswordReset = "Password reset"
    NewUserRegistered = "New user registered"


def smtp_client():
    smtp_server = Settings().SMTP_SERVER
    smtp_username = Settings().SMTP_USERNAME
    smtp_password = Settings().SMTP_PASSWORD

    if not smtp_server or not smtp_username or not smtp_password:
        raise EnvironmentError("SMTP_SERVER, SMTP_USERNAME, and SMTP_PASSWORD must be set")

    server = SMTP_SSL(smtp_server)
    server.login(smtp_username, smtp_password)
    return server

def get_template(subject: MailSubject, **kwargs) -> str:
    templates = {
        MailSubject.NewUserRegistered: new_user_register_template,
        MailSubject.PasswordReset: reset_password_template,
    }
    template_function = templates.get(subject)
    if template_function:
        return template_function(**kwargs)
    raise ValueError("No template found for the given subject")

def send_mail(to: str, subject: MailSubject, **kwargs):
    try:
        server = smtp_client()
        msg = MIMEMultipart()
        msg['From'] = Settings().SMTP_FROM_ADDRESS
        msg['To'] = to
        msg['Subject'] = subject.value
        template = get_template(subject, **kwargs)
        msg.attach(MIMEText(template, 'html'))
        server.sendmail(Settings().SMTP_FROM_ADDRESS, to, msg.as_string())
        server.quit()
        logger.info(f"{subject.value} - mail sent with success to {to}")
    except Exception as e:
        logger.error(f"{subject.value} - Error sending mail: {e}")
        return False
    return True
