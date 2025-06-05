import logging
from logging.config import dictConfig
from logging.handlers import TimedRotatingFileHandler

# Logging configuration
log_config = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": "%(asctime)s - %(levelname)s -  %(filename)s:%(lineno)d - %(message)s",
        },
        "detailed": {
            "format": "%(asctime)s - %(levelname)s - %(filename)s:%(lineno)d - %(message)s",
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
        "level": "INFO",
        "handlers": ["console", "file", "error_file"],
    },
    "loggers": {
        "uvicorn": {
            "level": "WARNING",
            "handlers": ["console", "file"],
            "propagate": False,
        },
        "app": {
            "level": "INFO",
            "handlers": ["console", "file"],
            "propagate": False,
        },
    },
}

dictConfig(log_config)

logger = logging.getLogger("app")
