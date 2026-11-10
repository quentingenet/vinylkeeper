import uuid

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String, UUID as SQLUUID, func

from app.models.base import Base


class RefreshSession(Base):
    """
    One login of a user on one device (a browser, the Android app). Its refresh token is renewed on
    every refresh: only the latest one (current_jti) is good, and the one before it (previous_jti)
    for a short grace period, so that a lost response or two tabs do not end a legitimate session.
    A token older than that, presented again, was copied: the session is revoked.
    """
    __tablename__ = "refresh_sessions"

    # The "sid" of the refresh token: random, it leads to no user by itself
    id = Column(SQLUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    current_jti = Column(String(32), nullable=False)
    previous_jti = Column(String(32), nullable=True)
    # "web" (cookies) or "native" (the Android app): told apart in the list of a user's devices
    client = Column(String(10), nullable=False, server_default="web")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    # Last renewal of the refresh token: the start of the grace period of previous_jti
    rotated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_refresh_sessions_user_id", "user_id"),
        Index("ix_refresh_sessions_expires_at", "expires_at"),
    )

    def __repr__(self):
        return f"<RefreshSession(id={self.id}, client={self.client})>"
