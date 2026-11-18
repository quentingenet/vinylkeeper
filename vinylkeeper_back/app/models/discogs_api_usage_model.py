from sqlalchemy import Column, DateTime, Integer, String

from app.models.base import Base


class DiscogsApiUsage(Base):
    """
    Calls made to the Discogs API in one hour by one part of the app, for the gauge of the admin page.
    Counted in memory by each process and added here about once a minute (see discogs_usage_service).
    """
    __tablename__ = "discogs_api_usage"

    hour = Column(DateTime(timezone=True), primary_key=True, comment="Start of the hour, UTC")
    source = Column(String(20), primary_key=True, comment="search, metadata, price, import, enrichment or oauth")
    calls = Column(Integer, nullable=False, default=0)
    rate_limited = Column(Integer, nullable=False, default=0, comment="Answers 429 among the calls")
    min_remaining = Column(Integer, nullable=True,
                           comment="Lowest X-Discogs-Ratelimit-Remaining seen in the hour, null when not sent")

    def __repr__(self):
        return f"<DiscogsApiUsage(hour={self.hour}, source={self.source!r}, calls={self.calls})>"
