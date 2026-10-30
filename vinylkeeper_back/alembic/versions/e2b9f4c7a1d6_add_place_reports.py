"""add_place_reports

Members report wrong information on an Atlas spot (name, description, address, website, type,
permanently closed), for an admin to fix from the admin panel. New table only.

Revision ID: e2b9f4c7a1d6
Revises: d8f3a6c1e5b7
Create Date: 2026-10-30 20:00:00.000000+01:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'e2b9f4c7a1d6'
down_revision: Union[str, None] = 'd8f3a6c1e5b7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'place_reports',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('place_id', sa.Integer(), sa.ForeignKey('places.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('issues', postgresql.ARRAY(sa.String(20)), nullable=False,
                  comment='Among name, description, address, website, type, closed'),
        sa.Column('comment', sa.String(500), nullable=True, comment="What it should be, in the member's words"),
        sa.Column('status', sa.String(10), server_default='open', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('resolved_by_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.CheckConstraint("status IN ('open', 'resolved', 'dismissed')", name='ck_place_reports_status'),
        sa.CheckConstraint(
            "cardinality(issues) > 0 AND issues <@ "
            "ARRAY['name', 'description', 'address', 'website', 'type', 'closed']::varchar[]",
            name='ck_place_reports_issues',
        ),
    )
    op.create_index('uq_place_reports_open_per_user', 'place_reports', ['place_id', 'user_id'], unique=True,
                    postgresql_where=sa.text("status = 'open'"))


def downgrade() -> None:
    op.drop_index('uq_place_reports_open_per_user', table_name='place_reports')
    op.drop_table('place_reports')
