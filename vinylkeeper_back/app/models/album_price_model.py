from sqlalchemy import (
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from app.models.base import Base


class AlbumPrice(Base):
    """
    Discogs suggested prices of a release, in EUR, shared by every user who owns it.
    'none' when Discogs has no price for the release: it is asked again at the next refresh.
    """
    __tablename__ = "album_prices"

    __table_args__ = (
        CheckConstraint("status IN ('ok', 'none')", name="ck_album_prices_status"),
    )

    album_id = Column(Integer, ForeignKey("albums.id", ondelete="CASCADE"), primary_key=True)
    status = Column(String(10), nullable=False, comment="'ok', or 'none' when Discogs has no price")
    # The three prices the collection value is made of: low, average and high
    price_very_good = Column(Numeric(10, 2), nullable=True)
    price_very_good_plus = Column(Numeric(10, 2), nullable=True)
    price_near_mint = Column(Numeric(10, 2), nullable=True)
    suggestions = Column(JSONB, nullable=True, comment="Every condition, keyed like vinyl_states.name")
    fetched_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<AlbumPrice(album_id={self.album_id}, status={self.status!r})>"


class AlbumPriceRequest(Base):
    """A release whose price a user asked to re-evaluate: worked through one at a time, then deleted."""
    __tablename__ = "album_price_requests"

    album_id = Column(Integer, ForeignKey("albums.id", ondelete="CASCADE"), primary_key=True)
    requested_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<AlbumPriceRequest(album_id={self.album_id})>"


class ValueRefresh(Base):
    """A re-evaluation of a collection value by a user: counted for the daily allowance."""
    __tablename__ = "value_refreshes"

    __table_args__ = (
        Index("ix_value_refreshes_user_id_created_at", "user_id", "created_at"),
    )

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<ValueRefresh(user_id={self.user_id}, created_at={self.created_at})>"


class ExchangeRate(Base):
    """How much of a currency one euro buys, refreshed every night (ECB rates)."""
    __tablename__ = "exchange_rates"

    currency = Column(String(3), primary_key=True)
    rate = Column(Numeric(12, 6), nullable=False)
    rate_date = Column(Date, nullable=False, comment="Date the rate was published")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<ExchangeRate(currency={self.currency!r}, rate={self.rate})>"
