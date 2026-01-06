"""sync_updated_at_with_created_at_in_associations

Revision ID: f31515000cc6
Revises: migrate_timestamps_assoc
Create Date: 2026-01-06 09:52:04.748770+01:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f31515000cc6'
down_revision: Union[str, None] = 'migrate_timestamps_assoc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Sync updated_at with created_at in association tables."""
    # Check if triggers exist and disable them temporarily
    # Many PostgreSQL setups have triggers that auto-update updated_at
    connection = op.get_bind()

    # Try to disable triggers (they may not exist, which is fine)
    # Use raw connection to handle exceptions properly
    try:
        connection.execute(
            sa.text("ALTER TABLE collection_album DISABLE TRIGGER ALL"))
    except Exception:
        # Triggers may not exist, continue anyway
        pass

    try:
        connection.execute(
            sa.text("ALTER TABLE collection_artist DISABLE TRIGGER ALL"))
    except Exception:
        # Triggers may not exist, continue anyway
        pass

    # Update collection_album: set updated_at = created_at for all records
    op.execute("""
        UPDATE collection_album
        SET updated_at = created_at
        WHERE created_at IS NOT NULL
    """)

    # Update collection_artist: set updated_at = created_at for all records
    op.execute("""
        UPDATE collection_artist
        SET updated_at = created_at
        WHERE created_at IS NOT NULL
    """)

    # Re-enable triggers if they were disabled
    try:
        connection.execute(
            sa.text("ALTER TABLE collection_album ENABLE TRIGGER ALL"))
    except Exception:
        # Triggers may not exist, continue anyway
        pass

    try:
        connection.execute(
            sa.text("ALTER TABLE collection_artist ENABLE TRIGGER ALL"))
    except Exception:
        # Triggers may not exist, continue anyway
        pass


def downgrade() -> None:
    """Cannot reverse sync operation - data would be lost."""
    # This migration only syncs data, no schema changes to reverse
    pass
