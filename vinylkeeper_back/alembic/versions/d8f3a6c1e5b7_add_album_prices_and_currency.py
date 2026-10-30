"""add_album_prices_and_currency

Discogs suggested prices of the releases kept in collections (in EUR, shared by every user),
the releases a user asked to re-evaluate (with the re-evaluations of each user, one a day at
most), the daily exchange rates to show prices in another
currency, and the currency each user picks.
New tables and a new column with a default: existing rows are untouched.

Revision ID: d8f3a6c1e5b7
Revises: c4a8e2f6b9d1
Create Date: 2026-10-30 18:00:00.000000+01:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'd8f3a6c1e5b7'
down_revision: Union[str, None] = 'c4a8e2f6b9d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'album_prices',
        sa.Column('album_id', sa.Integer(), sa.ForeignKey('albums.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('status', sa.String(10), nullable=False, comment="'ok', or 'none' when Discogs has no price"),
        sa.Column('price_very_good', sa.Numeric(10, 2), nullable=True),
        sa.Column('price_very_good_plus', sa.Numeric(10, 2), nullable=True),
        sa.Column('price_near_mint', sa.Numeric(10, 2), nullable=True),
        sa.Column('suggestions', postgresql.JSONB(), nullable=True,
                  comment='Every condition, keyed like vinyl_states.name'),
        sa.Column('fetched_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("status IN ('ok', 'none')", name='ck_album_prices_status'),
    )
    op.create_table(
        'album_price_requests',
        sa.Column('album_id', sa.Integer(), sa.ForeignKey('albums.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('requested_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_table(
        'value_refreshes',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_value_refreshes_user_id_created_at', 'value_refreshes', ['user_id', 'created_at'])
    op.create_table(
        'exchange_rates',
        sa.Column('currency', sa.String(3), primary_key=True),
        sa.Column('rate', sa.Numeric(12, 6), nullable=False),
        sa.Column('rate_date', sa.Date(), nullable=False, comment='Date the rate was published'),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.add_column('users', sa.Column('preferred_currency', sa.String(3), server_default='EUR', nullable=False))
    op.create_check_constraint('ck_users_preferred_currency', 'users', "preferred_currency IN ('EUR', 'USD')")


def downgrade() -> None:
    op.drop_constraint('ck_users_preferred_currency', 'users', type_='check')
    op.drop_column('users', 'preferred_currency')
    op.drop_table('exchange_rates')
    op.drop_index('ix_value_refreshes_user_id_created_at', table_name='value_refreshes')
    op.drop_table('value_refreshes')
    op.drop_table('album_price_requests')
    op.drop_table('album_prices')
