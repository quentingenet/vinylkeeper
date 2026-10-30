"""add_discogs_connections

"Connect with Discogs" (OAuth 1.0a): the Discogs account each user connected, its encrypted
access token, and the authorizations in progress. New tables only.

Revision ID: f5c1d9e3a7b2
Revises: e2b9f4c7a1d6
Create Date: 2026-10-30 22:00:00.000000+01:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'f5c1d9e3a7b2'
down_revision: Union[str, None] = 'e2b9f4c7a1d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'discogs_connections',
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('discogs_user_id', sa.BigInteger(), nullable=False, comment='Discogs id of the authorized account'),
        sa.Column('discogs_username', sa.String(100), nullable=False, comment='Username given by /oauth/identity'),
        sa.Column('access_token', sa.Text(), nullable=False, comment='Encrypted'),
        sa.Column('access_secret', sa.Text(), nullable=False, comment='Encrypted'),
        sa.Column('connected_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_table(
        'discogs_oauth_requests',
        sa.Column('request_token', sa.String(255), primary_key=True),
        sa.Column('request_secret', sa.Text(), nullable=False, comment='Encrypted'),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('discogs_oauth_requests')
    op.drop_table('discogs_connections')
