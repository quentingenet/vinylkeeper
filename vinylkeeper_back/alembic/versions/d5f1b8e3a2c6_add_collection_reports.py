"""add_collection_reports

Members report abuse in a public collection of another member (offensive, spam, other), for an
admin to check: same columns as place_reports for who reported and how it was closed, one open
report per member and collection.

Revision ID: d5f1b8e3a2c6
Revises: c4e9a2f7b1d3
Create Date: 2026-11-18 19:00:00.000000+01:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'd5f1b8e3a2c6'
down_revision: Union[str, None] = 'c4e9a2f7b1d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'collection_reports',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('collection_id', sa.Integer(), sa.ForeignKey('collections.id', ondelete='CASCADE'),
                  nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('reason', sa.String(20), nullable=False, comment='offensive, spam or other'),
        sa.Column('comment', sa.String(500), nullable=True, comment="What is wrong, in the member's words"),
        sa.Column('status', sa.String(10), server_default='open', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('resolved_by_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.CheckConstraint("status IN ('open', 'resolved', 'dismissed')", name='ck_collection_reports_status'),
        sa.CheckConstraint("reason IN ('offensive', 'spam', 'other')", name='ck_collection_reports_reason'),
    )
    op.create_index('uq_collection_reports_open_per_user', 'collection_reports', ['collection_id', 'user_id'],
                    unique=True, postgresql_where=sa.text("status = 'open'"))


def downgrade() -> None:
    op.drop_index('uq_collection_reports_open_per_user', table_name='collection_reports')
    op.drop_table('collection_reports')
