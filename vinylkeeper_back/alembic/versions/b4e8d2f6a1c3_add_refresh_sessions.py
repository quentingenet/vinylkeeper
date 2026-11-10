"""add_refresh_sessions

One row per login on a device, so that a refresh token is renewed at every refresh and a copied
one is detected. Existing refresh tokens carry no session: the first refresh of each opens one.

Revision ID: b4e8d2f6a1c3
Revises: a7c3e9f1b4d2
Create Date: 2026-11-10 20:00:00.000000+01:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'b4e8d2f6a1c3'
down_revision: Union[str, None] = 'a7c3e9f1b4d2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'refresh_sessions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('current_jti', sa.String(32), nullable=False),
        sa.Column('previous_jti', sa.String(32), nullable=True),
        sa.Column('client', sa.String(10), server_default='web', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('rotated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_refresh_sessions_user_id', 'refresh_sessions', ['user_id'])
    op.create_index('ix_refresh_sessions_expires_at', 'refresh_sessions', ['expires_at'])


def downgrade() -> None:
    op.drop_index('ix_refresh_sessions_expires_at', table_name='refresh_sessions')
    op.drop_index('ix_refresh_sessions_user_id', table_name='refresh_sessions')
    op.drop_table('refresh_sessions')
