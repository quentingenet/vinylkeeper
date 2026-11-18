from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class UsageTotals(BaseModel):
    calls: int = Field(..., description="Calls made to the Discogs API")
    rate_limited: int = Field(..., description="Calls Discogs answered with a 429")
    capacity: int = Field(..., description="Calls Discogs allows over the same period")


class SourceUsage(BaseModel):
    source: str = Field(..., description="search, metadata, price, import, enrichment or oauth")
    calls_current_hour: int
    calls_last_24_hours: int
    rate_limited_last_24_hours: int


class HourUsage(BaseModel):
    hour: datetime = Field(..., description="Start of the hour, UTC")
    calls: int
    rate_limited: int


class DiscogsUsageResponse(BaseModel):
    current_hour: UsageTotals
    last_24_hours: UsageTotals
    by_source: list[SourceUsage] = Field(..., description="Every source, the busiest over 24 hours first")
    hours: list[HourUsage] = Field(..., description="The last 24 hours, oldest first, the current one last")
    lowest_remaining: Optional[int] = Field(
        None, description="Lowest X-Discogs-Ratelimit-Remaining seen in the last 24 hours, null if never sent")
    delay_seconds: int = Field(..., description="The counts can be that late: each process writes them that often")
