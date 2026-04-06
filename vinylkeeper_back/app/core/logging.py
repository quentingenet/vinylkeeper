import logging
import os
import traceback
from logging.config import dictConfig
from logging.handlers import TimedRotatingFileHandler
from app.core.config_env import settings

# Determine log level based on environment
if settings.APP_ENV == "production":
    default_level = "INFO"     # INFO level in production (already optimized)
    app_level = "INFO"         # INFO level in production (already optimized)
    uvicorn_level = "ERROR"
else:
    default_level = "INFO"
    app_level = "INFO"
    uvicorn_level = "ERROR"

# Logging configuration
log_config = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": "%(asctime)s CEST - %(levelname)s -  %(filename)s:%(lineno)d - %(message)s",
        },
        "detailed": {
            "format": "%(asctime)s CEST - %(levelname)s - %(filename)s:%(lineno)d - %(message)s",
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
