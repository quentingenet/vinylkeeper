"""merge_heads

Revision ID: e21590f35882
Revises: 7ba7696c9ee3, e982c48bbb0d
Create Date: 2025-06-15 08:06:25.591099+02:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e21590f35882'
down_revision: Union[str, None] = ('7ba7696c9ee3', 'e982c48bbb0d')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
