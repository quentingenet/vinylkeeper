"""add_users_language

Language of the interface a user picks: 'en', 'fr', 'es' or 'pt'. NULL (every existing account) follows
the language of the device.

Revision ID: f7d2a9c4e1b8
Revises: c5f1a9d3e7b2
Create Date: 2026-11-17 10:00:00.000000+01:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'f7d2a9c4e1b8'
down_revision: Union[str, None] = 'c5f1a9d3e7b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('language', sa.String(2), nullable=True))
    op.create_check_constraint('ck_users_language', 'users', "language IN ('en', 'fr', 'es', 'pt')")


def downgrade() -> None:
    op.drop_constraint('ck_users_language', 'users', type_='check')
    op.drop_column('users', 'language')
