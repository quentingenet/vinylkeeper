"""The models declare the production indexes, and only those.

An index missing from the models is dropped by the next `alembic revision --autogenerate`
(migration restore_critical_performance_indexes had to put some back); an index declared
again after migration 9f0fb98ad1aa dropped it would be recreated for nothing.
Definitions below are copied from the production database (pg_indexes, October 2026).
"""
import importlib.util
import re
from pathlib import Path

import pytest
from sqlalchemy.dialects import postgresql
from sqlalchemy.schema import CreateIndex

import app.models  # noqa: F401  (registers every model on the metadata)
from app.models.base import Base

PRODUCTION_INDEXES = {
    "ix_albums_title_trgm": "ON albums USING gin (title gin_trgm_ops)",
    "ix_artists_title_trgm": "ON artists USING gin (title gin_trgm_ops)",
    "ix_collection_album_album_id": "ON collection_album (album_id)",
    "ix_collection_album_updated_at":
        "ON collection_album (updated_at) WHERE updated_at IS NOT NULL",
    "ix_collection_artist_artist_id": "ON collection_artist (artist_id)",
    "ix_collection_artist_updated_at":
        "ON collection_artist (updated_at) WHERE updated_at IS NOT NULL",
    "ix_collections_is_public_created_at": "ON collections (is_public, created_at DESC)",
    "ix_collections_is_public_updated_at": "ON collections (is_public, updated_at DESC)",
    "ix_places_coordinates_exact_search":
        "ON places (latitude, longitude) WHERE is_valid = true AND is_moderated = true "
        "AND latitude IS NOT NULL AND longitude IS NOT NULL",
    "ix_places_map_valid_moderated_coords":
        "ON places (latitude, longitude, id, city) WHERE is_valid = true AND is_moderated = true "
        "AND latitude IS NOT NULL AND longitude IS NOT NULL",
    "ix_wishlist_user_id_entity_type": "ON wishlist (user_id, entity_type_id)",
    # Migration d4a7c2e9f1b3: one account per email whatever its case
    "ix_users_email_lower": "ON users (lower(email))",
}
UNIQUE_PRODUCTION_INDEXES = {"ix_users_email_lower"}


def _declared_indexes():
    return {ix.name: ix for table in Base.metadata.tables.values() for ix in table.indexes}


def _normalize(ddl):
    return re.sub(r"[()\s]", "", ddl).lower()


@pytest.mark.parametrize("name", sorted(PRODUCTION_INDEXES))
def test_production_index_is_declared_with_the_same_definition(name):
    index = _declared_indexes().get(name)
    assert index is not None, f"{name} exists in production but is not declared in the models"

    ddl = str(CreateIndex(index).compile(dialect=postgresql.dialect()))
    create = "CREATE UNIQUE INDEX" if name in UNIQUE_PRODUCTION_INDEXES else "CREATE INDEX"
    assert _normalize(ddl) == _normalize(f"{create} {name} {PRODUCTION_INDEXES[name]}")


def _dropped_indexes():
    path = Path(__file__).parents[2] / "alembic/versions/9f0fb98ad1aa_drop_redundant_indexes.py"
    spec = importlib.util.spec_from_file_location("drop_redundant_indexes", path)
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    return migration.REDUNDANT_INDEXES


@pytest.mark.parametrize("name", sorted(_dropped_indexes()))
def test_dropped_index_is_not_declared_again(name):
    assert name not in _declared_indexes()


def test_unique_indexes_are_production_indexes():
    assert UNIQUE_PRODUCTION_INDEXES <= set(PRODUCTION_INDEXES)


def test_no_index_is_both_kept_and_dropped():
    assert not set(PRODUCTION_INDEXES) & set(_dropped_indexes())
