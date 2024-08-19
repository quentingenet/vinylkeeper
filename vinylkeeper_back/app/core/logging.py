import logging
from logging.config import dictConfig
from logging.handlers import TimedRotatingFileHandler

# Logging configuration
log_config = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        },
        "detailed": {
            "format": "%(asctime)s - %(name)s - %(levelname)s - %(pathname)s:%(lineno)d - %(message)s",
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
            "filename": "app_vk.log",
            "when": "W0",  # W0 --> every Monday
            "interval": 1,  # 1 week
            "backupCount": 4,  # Keep 4 weeks of log files
        },
    },
    "root": {
        "level": "INFO",
        "handlers": ["console", "file"],
    },
    "loggers": {
        "uvicorn": {
            "level": "INFO",
            "handlers": ["console", "file"],
            "propagate": False,
        },
        "app": {
            "level": "DEBUG",
            "handlers": ["console", "file"],
            "propagate": False,
        },
    },
}

dictConfig(log_config)

logger = logging.getLogger("app")
