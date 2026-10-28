"""add_users_is_email_confirmed

Whether the user clicked the confirmation link sent at registration or on an email change.
Existing accounts are considered confirmed: the column is added with a true default, which
fills the existing rows, then the default becomes false for the accounts created afterwards.
It never blocks the login.

Revision ID: b8e5f1a2c7d4
Revises: 3c7e1a9d5b20
Create Date: 2026-10-28 22:00:00.000000+01:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'b8e5f1a2c7d4'
down_revision: Union[str, None] = '3c7e1a9d5b20'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column('is_email_confirmed', sa.Boolean(), server_default=sa.true(), nullable=False),
    )
    op.alter_column('users', 'is_email_confirmed', server_default=sa.false())


def downgrade() -> None:
    op.drop_column('users', 'is_email_confirmed')
