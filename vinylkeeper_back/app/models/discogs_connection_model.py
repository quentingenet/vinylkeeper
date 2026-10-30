from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, Integer, String, Text, func
from app.models.base import Base


class DiscogsConnection(Base):
    """
    The Discogs account a user connected with OAuth: imports read it as this identity, never
    as a username typed by hand. The access token and secret are stored encrypted (Fernet).
    """
    __tablename__ = "discogs_connections"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    discogs_user_id = Column(BigInteger, nullable=False, comment="Discogs id of the authorized account")
    discogs_username = Column(String(100), nullable=False, comment="Username given by /oauth/identity")
    access_token = Column(Text, nullable=False, comment="Encrypted")
    access_secret = Column(Text, nullable=False, comment="Encrypted")
    connected_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<DiscogsConnection(user_id={self.user_id}, discogs_username={self.discogs_username!r})>"


class DiscogsOAuthRequest(Base):
    """
    An authorization in progress: the request token Discogs gave, for the user who asked for it.
    The callback finds the user by this token, then deletes it: one use, a few minutes at most.
    """
    __tablename__ = "discogs_oauth_requests"

    request_token = Column(String(255), primary_key=True)
    request_secret = Column(Text, nullable=False, comment="Encrypted")
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
