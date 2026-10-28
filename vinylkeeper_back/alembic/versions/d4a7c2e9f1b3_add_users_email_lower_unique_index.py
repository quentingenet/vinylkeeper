"""add_users_email_lower_unique_index

One account per email address whatever its case: John@x.fr and john@x.fr were two accounts.
The emails already stored are left as they are; lookups compare lower(email).

The upgrade stops, without changing anything, if accounts already differ only by the case
of their email: which one to keep is a decision to take by hand, not here.
Check before deploying:
    SELECT lower(email), count(*) FROM users GROUP BY lower(email) HAVING count(*) > 1;

Revision ID: d4a7c2e9f1b3
Revises: b8e5f1a2c7d4
Create Date: 2026-10-28 23:00:00.000000+01:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'd4a7c2e9f1b3'
down_revision: Union[str, None] = 'b8e5f1a2c7d4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    duplicates = op.get_bind().execute(sa.text(
        "SELECT count(*) FROM (SELECT lower(email) FROM users GROUP BY lower(email) HAVING count(*) > 1) d"
    )).scalar()
    if duplicates:
        raise RuntimeError(
            f"{duplicates} email address(es) used by several accounts with a different case: "
            "merge or remove them by hand, then run the migration again "
            "(SELECT lower(email), count(*) FROM users GROUP BY lower(email) HAVING count(*) > 1)"
        )
    op.create_index('ix_users_email_lower', 'users', [sa.text('lower(email)')], unique=True)


def downgrade() -> None:
    op.drop_index('ix_users_email_lower', table_name='users')
