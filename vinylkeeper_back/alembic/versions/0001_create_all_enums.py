"""create all enums for Vinyl Keeper

Revision ID: 0001_create_all_enums
Revises: 
Create Date: 2025-06-15 09:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# Alembic identifiers
revision = '0001_create_all_enums'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        "CREATE TYPE moderationstatusenum AS ENUM ('pending', 'accepted', 'rejected')")
    op.execute(
        "CREATE TYPE placetypeenum AS ENUM ('shop', 'venue', 'record_store', 'other', 'brocant')")
    op.execute("CREATE TYPE roleenum AS ENUM ('admin', 'user', 'moderator')")
    op.execute("CREATE TYPE entitytypeenum AS ENUM ('ALBUM', 'ARTIST')")
    op.execute(
        "CREATE TYPE stateenum AS ENUM ('MINT', 'NEAR_MINT', 'VERY_GOOD', 'GOOD', 'FAIR', 'POOR')")
    op.execute(
        "CREATE TYPE moodenum AS ENUM ('HAPPY', 'SAD', 'EXCITED', 'CALM', 'ANGRY', 'RELAXED', 'ENERGETIC', 'MELANCHOLIC')")
    op.execute(
        "CREATE TYPE externalsourceenum AS ENUM ('deezer', 'spotify', 'musicbrainz', 'discogs', 'last_fm')")


def downgrade():
    # delete enums in the right order to avoid conflicts
    op.execute("DROP TYPE IF EXISTS externalsourceenum")
    op.execute("DROP TYPE IF EXISTS moodenum")
    op.execute("DROP TYPE IF EXISTS stateenum")
    op.execute("DROP TYPE IF EXISTS entitytypeenum")
    op.execute("DROP TYPE IF EXISTS roleenum")
    op.execute("DROP TYPE IF EXISTS placetypeenum")
    op.execute("DROP TYPE IF EXISTS moderationstatusenum")
