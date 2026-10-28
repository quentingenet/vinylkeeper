"""add_users_token_version

Version stamped into every JWT. A password change or reset bumps it, which revokes the
tokens issued before (other sessions, an already used reset link). Existing rows and
tokens issued before this column carry version 0, so nobody is logged out on deploy.

Revision ID: 3c7e1a9d5b20
Revises: 9f0fb98ad1aa
Create Date: 2026-10-28 19:00:00.000000+01:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = '3c7e1a9d5b20'
down_revision: Union[str, None] = '9f0fb98ad1aa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column('token_version', sa.Integer(), server_default='0', nullable=False),
    )


def downgrade() -> None:
    op.drop_column('users', 'token_version')
