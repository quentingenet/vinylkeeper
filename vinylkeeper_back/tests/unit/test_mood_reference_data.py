"""
Mood vocabulary: enum, seed descriptions, migration data and model definitions
must stay in sync. Startup seeding only runs on an empty reference table, so any
drift here would silently diverge between fresh installs and production.
"""
import importlib.util
import pathlib
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

from app.core.enums import MoodEnum
from app.db.init_references_data_db import MOOD_DESCRIPTIONS, insert_enum_values
from app.models.album_mood_model import AlbumMood
from app.models.reference_data.moods import Mood

ORIGINAL_MOODS = {
    "happy", "sad", "energetic", "calm", "nostalgic",
    "romantic", "mysterious", "uplifting", "melancholic", "powerful",
}
NEW_MOODS = {"groovy", "aggressive", "dark", "dreamy", "spiritual", "laid_back", "rebellious"}

MIGRATION_PATH = (
    pathlib.Path(__file__).parents[2]
    / "alembic" / "versions" / "ac822a1dbbb3_add_mood_descriptions_and_album_moods.py"
)


def load_migration():
    spec = importlib.util.spec_from_file_location("mood_migration", MIGRATION_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class TestMoodVocabulary:
    def test_enum_contains_original_and_new_moods(self):
        assert {m.value for m in MoodEnum} == ORIGINAL_MOODS | NEW_MOODS

    def test_original_moods_are_never_renamed(self):
        assert ORIGINAL_MOODS <= {m.value for m in MoodEnum}

    def test_descriptions_cover_exactly_the_enum(self):
        assert set(MOOD_DESCRIPTIONS) == {m.value for m in MoodEnum}

    def test_descriptions_are_non_empty_and_fit_the_column(self):
        for name, description in MOOD_DESCRIPTIONS.items():
            assert description.strip(), name
            assert len(description) <= 255, name

    def test_migration_data_matches_seed_descriptions(self):
        migration = load_migration()
        assert set(migration.EXISTING_MOOD_DESCRIPTIONS) == ORIGINAL_MOODS
        assert set(migration.NEW_MOOD_DESCRIPTIONS) == NEW_MOODS
        merged = {**migration.EXISTING_MOOD_DESCRIPTIONS, **migration.NEW_MOOD_DESCRIPTIONS}
        assert merged == MOOD_DESCRIPTIONS

    def test_migration_follows_current_head(self):
        migration = load_migration()
        assert migration.down_revision == "b222fb2e3d98"


class TestInsertEnumValuesWithDescriptions:
    @staticmethod
    def make_session(existing_names: set[str]) -> MagicMock:
        """Session whose SELECT returns a row only for names already present."""
        db = MagicMock()

        async def execute(statement):
            name = statement.compile().params["name_1"]
            result = MagicMock()
            result.scalar_one_or_none.return_value = (
                SimpleNamespace(name=name) if name in existing_names else None
            )
            return result

        db.execute = AsyncMock(side_effect=execute)
        return db

    async def test_inserts_only_missing_moods_with_their_description(self):
        db = self.make_session(existing_names=ORIGINAL_MOODS)

        await insert_enum_values(db, Mood, MoodEnum, MOOD_DESCRIPTIONS)

        added = [call.args[0] for call in db.add.call_args_list]
        assert {mood.name for mood in added} == NEW_MOODS
        for mood in added:
            assert mood.description == MOOD_DESCRIPTIONS[mood.name]

    async def test_existing_moods_are_left_untouched(self):
        db = self.make_session(existing_names=ORIGINAL_MOODS | NEW_MOODS)

        await insert_enum_values(db, Mood, MoodEnum, MOOD_DESCRIPTIONS)

        db.add.assert_not_called()

    async def test_empty_table_gets_every_mood_with_description(self):
        db = self.make_session(existing_names=set())

        await insert_enum_values(db, Mood, MoodEnum, MOOD_DESCRIPTIONS)

        added = [call.args[0] for call in db.add.call_args_list]
        assert len(added) == len(MoodEnum)
        assert all(mood.description for mood in added)


class TestModelDefinitions:
    def test_mood_has_nullable_description(self):
        column = Mood.__table__.c.description
        assert column.nullable is True
        assert column.type.length == 255

    def test_mood_collections_is_lazy_raise(self):
        assert Mood.collections.property.lazy == "raise"

    def test_album_mood_primary_key_and_foreign_keys(self):
        table = AlbumMood.__table__
        assert {c.name for c in table.primary_key.columns} == {"album_id", "mood_id"}
        album_fk = next(iter(table.c.album_id.foreign_keys))
        mood_fk = next(iter(table.c.mood_id.foreign_keys))
        assert album_fk.target_fullname == "albums.id" and album_fk.ondelete == "CASCADE"
        assert mood_fk.target_fullname == "moods.id" and mood_fk.ondelete == "RESTRICT"

    def test_album_mood_source_check_and_index(self):
        table = AlbumMood.__table__
        constraint_names = {c.name for c in table.constraints}
        assert "ck_album_moods_source" in constraint_names
        assert "ix_album_moods_mood_id" in {i.name for i in table.indexes}
        assert table.c.source.nullable is False

    def test_album_mood_relationships_are_lazy_raise(self):
        assert AlbumMood.album.property.lazy == "raise"
        assert AlbumMood.mood.property.lazy == "raise"
