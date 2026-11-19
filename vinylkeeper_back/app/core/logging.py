from contextvars import ContextVar
import logging
import os
import re
from logging.config import dictConfig
from typing import Optional

# Same levels in every environment
default_level = "INFO"
app_level = "INFO"
uvicorn_level = "ERROR"

# The UTC offset comes from the clock (TZ=Europe/Paris), so it is right in summer and winter
LOG_DATE_FORMAT = "%Y-%m-%d %H:%M:%S %z"

# Logging configuration
log_config = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": "%(asctime)s - %(levelname)s -  %(filename)s:%(lineno)d - %(message)s",
            "datefmt": LOG_DATE_FORMAT,
        },
        "detailed": {
            "format": "%(asctime)s - %(levelname)s - %(filename)s:%(lineno)d - %(message)s",
            "datefmt": LOG_DATE_FORMAT,
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "default",
        },
        "file": {
            "class": "logging.handlers.TimedRotatingFileHandler",
            "formatter": "detailed",
            "filename": "api_vk.log",
            "when": "W0",  # W0 --> every Monday
            "interval": 1,  # 1 week
            "backupCount": 4,  # Keep 4 weeks of log files
            "encoding": "utf8",
        },
        "error_file": {
            "class": "logging.handlers.TimedRotatingFileHandler",
            "formatter": "detailed",
            "filename": "errors_api_vk.log",
            "when": "W0",  # W0 --> every Monday
            "interval": 1,  # 1 week
            "backupCount": 4,  # Keep 4 weeks of log files
            "level": "ERROR",
            "encoding": "utf8",
        },
    },
    "root": {
        "level": default_level,
        "handlers": ["console", "file", "error_file"],
    },
    "loggers": {
        "uvicorn": {
            "level": uvicorn_level,
            "handlers": ["console", "file"],
            "propagate": False,
        },
        "uvicorn.access": {
            "level": "ERROR",  # Disable access logs
            "handlers": [],
            "propagate": False,
        },
        "app": {
            "level": app_level,
            "handlers": ["console", "file"],
            "propagate": False,
        },
        "httpx": {
            "level": "ERROR",  # Reduce HTTP client logs
            "handlers": [],
            "propagate": False,
        },
        "sqlalchemy": {
            "level": "ERROR",  # Reduce database logs
            "handlers": [],
            "propagate": False,
        },
        "requests": {
            "level": "ERROR",  # Reduce requests logs
            "handlers": [],
            "propagate": False,
        },
        "urllib3": {
            "level": "ERROR",  # Reduce urllib3 logs
            "handlers": [],
            "propagate": False,
        },
    },
}

dictConfig(log_config)

logger = logging.getLogger("app")


# Who the request is from, for the error logs: the username once the session is known, the masked email on the
# routes without a session that receive one (login, sign up, forgot password). Each request runs in its own task,
# so the value never leaks from one request to the next.
_log_actor: ContextVar[Optional[str]] = ContextVar("log_actor", default=None)


def set_log_actor(who: str) -> None:
    """A username, or an email masked with mask_email: never a password, a token or a full address."""
    _log_actor.set(who)


def log_actor() -> str:
    return _log_actor.get() or "anonymous"


class LogActorMiddleware:
    """
    Every request starts with no actor, whatever ran before in the same context. Cleared at the start, not at the
    end: the handler of unexpected errors runs outside the middlewares and still reads it.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            _log_actor.set(None)
        await self.app(scope, receive, send)


def log_activity(who: str, what: str) -> None:
    """
    One line per user action, all starting with "Activity:" so the live logs can be filtered
    on what happens on the site. Usernames only: no email address, no password, no token.
    stacklevel=2: the line shows the file and line of the action, not of this helper.
    """
    logger.info(f"Activity: {who} {what}", stacklevel=2)


_EMAIL_ADDRESS = re.compile(r"([A-Za-z0-9._%+-]+)@[A-Za-z0-9.-]+")


def mask_email(text: str) -> str:
    """Every email address of a text as john@***: the user stays recognisable, the address never reaches the logs."""
    return _EMAIL_ADDRESS.sub(r"\1@***", text)


def extract_file_info(tb) -> str:
    """Extract a short file:line string from a traceback, rooted at /app."""
    if tb:
        last_frame = tb[-1]
        full_path = last_frame.filename
        if '/app' in full_path:
            app_index = full_path.find('/app')
            file_info = full_path[app_index + 1:]
        else:
            file_info = os.path.basename(full_path)
        return f"{file_info}:{last_frame.lineno}"
    return "unknown:0"
