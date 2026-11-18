"""What every kind of member report shares in the API."""
from typing import Literal, Optional

from pydantic import BaseModel

ReportStatus = Literal["open", "resolved", "dismissed"]
REPORTS_DEFAULT_LIMIT = 20
REPORTS_MAX_LIMIT = 50


def blank_is_none(value: Optional[str]) -> Optional[str]:
    """A comment of spaces only is no comment."""
    return value.strip() or None if value is not None else None


class ReportCreatedResponse(BaseModel):
    message: str
