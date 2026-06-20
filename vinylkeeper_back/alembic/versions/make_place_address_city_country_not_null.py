"""make place address, city, country NOT NULL

Revision ID: place_location_not_null
Revises: restore_critical_indexes
Create Date: 2026-06-20 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'place_location_not_null'
down_revision: Union[str, None] = 'b475567323ec'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('places', 'address',
                    existing_type=sa.String(255),
                    nullable=False)
    op.alter_column('places', 'city',
                    existing_type=sa.String(100),
                    nullable=False)
    op.alter_column('places', 'country',
                    existing_type=sa.String(100),
                    nullable=False)


def downgrade() -> None:
    op.alter_column('places', 'country',
                    existing_type=sa.String(100),
                    nullable=True)
    op.alter_column('places', 'city',
                    existing_type=sa.String(100),
                    nullable=True)
    op.alter_column('places', 'address',
                    existing_type=sa.String(255),
                    nullable=True)
