"""add_users_last_seen_at

Last time a user was there: login form, sign up, or a session restored by the refresh token
(last_login only counts the login form). Existing accounts start from their last_login.

Revision ID: a3d6f8b1c9e2
Revises: f1c8a3b7d2e4
Create Date: 2026-10-29 16:00:00.000000+01:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'a3d6f8b1c9e2'
down_revision: Union[str, None] = 'f1c8a3b7d2e4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('last_seen_at', sa.DateTime(timezone=True), nullable=True))
    op.execute("UPDATE users SET last_seen_at = last_login")


def downgrade() -> None:
    op.drop_column('users', 'last_seen_at')
