"""add_users_language_de_it

German and Italian join the languages of the interface a user can pick: the check of
users.language accepts 'de' and 'it' too. Existing values are untouched.

Revision ID: b3c8e5a1d7f4
Revises: f7d2a9c4e1b8
Create Date: 2026-11-17 18:00:00.000000+01:00

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'b3c8e5a1d7f4'
down_revision: Union[str, None] = 'f7d2a9c4e1b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint('ck_users_language', 'users', type_='check')
    op.create_check_constraint('ck_users_language', 'users', "language IN ('en', 'fr', 'es', 'pt', 'de', 'it')")


def downgrade() -> None:
    # The former check refuses German and Italian: those members follow their device again
    op.execute("UPDATE users SET language = NULL WHERE language IN ('de', 'it')")
    op.drop_constraint('ck_users_language', 'users', type_='check')
    op.create_check_constraint('ck_users_language', 'users', "language IN ('en', 'fr', 'es', 'pt')")
