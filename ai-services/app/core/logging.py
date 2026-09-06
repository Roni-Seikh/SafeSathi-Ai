import logging
import sys

from app.core.settings import settings


def configure_logging() -> logging.Logger:
    logger = logging.getLogger("safesathi.ai")
    if logger.handlers:
        return logger  # already configured (e.g. reimported under uvicorn --reload)

    handler = logging.StreamHandler(sys.stdout)
    fmt = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
    handler.setFormatter(logging.Formatter(fmt))
    logger.addHandler(handler)
    logger.setLevel(logging.DEBUG if settings.env == "development" else logging.INFO)
    return logger


logger = configure_logging()
