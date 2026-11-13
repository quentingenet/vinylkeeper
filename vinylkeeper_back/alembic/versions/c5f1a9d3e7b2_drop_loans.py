"""drop_loans

The loans table was never written nor read: no repository, service or endpoint ever used it, and the
API sent a loans_count always 0. A lending feature is not planned. The upgrade refuses to drop a
table that holds rows, rather than lose them. A downgrade recreates it as it was in production.

Revision ID: c5f1a9d3e7b2
Revises: b4e8d2f6a1c3
Create Date: 2026-11-13 15:00:00.000000+01:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'c5f1a9d3e7b2'
down_revision: Union[str, None] = 'b4e8d2f6a1c3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    rows = op.get_bind().execute(sa.text("SELECT count(*) FROM loans")).scalar_one()
    if rows:
        raise RuntimeError(f"loans holds {rows} rows: not dropped, check them first")
    op.drop_table('loans')


def downgrade() -> None:
    op.create_table(
        'loans',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('album_id', sa.Integer(), nullable=False),
        sa.Column('loaned_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('returned_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('is_returned', sa.Boolean(), nullable=False),
        sa.Column('comment', sa.String(length=255), nullable=True),
        sa.Column('borrower_name', sa.String(length=255), nullable=False),
        sa.Column('start_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('end_date', sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint('(end_date IS NULL OR start_date <= end_date)', name='check_start_before_end'),
        sa.CheckConstraint('length(comment) <= 255', name='check_comment_length'),
        sa.ForeignKeyConstraint(['album_id'], ['albums.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_loans_album_id', 'loans', ['album_id'], unique=False)
    op.create_index('ix_loans_user_id', 'loans', ['user_id'], unique=False)
