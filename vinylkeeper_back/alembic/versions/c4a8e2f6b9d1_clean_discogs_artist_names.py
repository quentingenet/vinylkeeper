"""clean_discogs_artist_names

Artists were stored with the name the Discogs search shows, homonym marker included:
'Trust (2)', 'Jimmy Smith (12)', 'Hirt*'. New artists are cleaned on creation
(app.utils.discogs_release.clean_artist_name), this cleans the existing ones and the
wanted artists of the wishlist the same way. Only the trailing marker goes: '&' and
the rest of the name stay. Data only, not reversible.

Revision ID: c4a8e2f6b9d1
Revises: b7e2c4f9a1d3
Create Date: 2026-10-30 16:00:00.000000+01:00

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'c4a8e2f6b9d1'
down_revision: Union[str, None] = 'b7e2c4f9a1d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Same steps as clean_artist_name: trailing '*', then ' (2)', then '*' again
CLEAN = (
    r"btrim(rtrim(regexp_replace(btrim(rtrim(btrim(title), '*')), '\s*\(\d+\)$', ''), '*'))"
)


def upgrade() -> None:
    op.execute(f"UPDATE artists SET title = {CLEAN} WHERE title <> {CLEAN} AND {CLEAN} <> ''")
    op.execute(
        f"UPDATE wishlist SET title = {CLEAN} "
        f"WHERE entity_type_id = (SELECT id FROM entity_types WHERE name = 'artist') "
        f"AND title <> {CLEAN} AND {CLEAN} <> ''"
    )


def downgrade() -> None:
    # The markers are not kept anywhere: nothing to restore
    pass
