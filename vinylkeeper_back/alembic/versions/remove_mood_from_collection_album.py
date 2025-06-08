"""remove mood from collection_album

Revision ID: remove_mood
Revises: de648ccdb1ff
Create Date: 2025-06-15 20:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'remove_mood'
down_revision: Union[str, None] = 'de648ccdb1ff'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Drop mood column from collection_album table
    op.drop_column('collection_album', 'mood')


def downgrade() -> None:
    """Downgrade schema."""
    # Add mood column back to collection_album table
    op.add_column('collection_album', sa.Column('mood', postgresql.ENUM('HAPPY', 'SAD', 'EXCITED', 'CALM', 'ANGRY',
                  'RELAXED', 'ENERGETIC', 'MELANCHOLIC', name='moodenum'), nullable=True, comment='Mood associated with this album'))
