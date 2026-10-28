"""Rule-based album moods: scoring, rules file validation, assignment and CLIs."""
from collections import Counter
from unittest.mock import AsyncMock, patch

import pytest

import app.cli.assign_moods as assign_cli
import app.cli.sync_mood_rules as sync_cli
from app.core.enums import MoodEnum
from app.data.tag_mood_rules import GENRE_RULES, STYLE_RULES, TAG_MOOD_RULES
from app.services.mood_assignment_service import (
    MAX_MOODS,
    MoodAssignmentReport,
    MoodAssignmentService,
    compute_moods,
    validate_rules,
)

RULES = {
    "Cool Jazz": {"calm": 3, "laid_back": 2},
    "Modal": {"mysterious": 3, "calm": 2},
    "Jazz": {"laid_back": 1, "mysterious": 1},
    "Blues": {"melancholic": 2},
    "Ballad": {"sad": 3, "romantic": 2},
    "Hint": {"happy": 1},
    "Many": {"happy": 3, "groovy": 3, "energetic": 3, "uplifting": 3},
}


class TestComputeMoods:
    def test_styles_are_scored_and_ranked(self):
        assert compute_moods(["Cool Jazz", "Modal"], ["Jazz"], RULES) == ["calm", "mysterious", "laid_back"]

    def test_genres_are_only_a_fallback(self):
        assert compute_moods(["Unknown Style"], ["Blues"], RULES) == ["melancholic"]
        assert "melancholic" not in compute_moods(["Cool Jazz"], ["Blues"], RULES)

    def test_genres_complete_styles_that_are_not_conclusive(self):
        # "Hint" alone scores happy 1 (< MIN_SCORE): the genre is added on top
        assert compute_moods(["Hint"], ["Jazz"], RULES) == []
        assert compute_moods(["Hint"], ["Blues"], RULES) == ["melancholic"]
        assert compute_moods(["Hint"], ["Hint"], RULES) == ["happy"]

    def test_weak_hints_alone_give_no_mood(self):
        assert compute_moods(["Hint"], [], RULES) == []

    def test_no_known_tag_gives_no_mood(self):
        assert compute_moods([], [], RULES) == []
        assert compute_moods(["Nope"], ["Nope"], RULES) == []

    def test_at_most_three_moods_with_stable_tie_break(self):
        moods = compute_moods(["Many"], [], RULES)
        assert len(moods) == MAX_MOODS
        assert moods == ["energetic", "groovy", "happy"]  # equal scores -> alphabetical

    def test_sad_and_melancholic_are_never_combined(self):
        moods = compute_moods(["Ballad", "Blues"], [], RULES)
        assert "sad" in moods and "melancholic" not in moods

    def test_repeated_style_keeps_the_same_top_mood(self):
        assert compute_moods(["Cool Jazz", "Cool Jazz"], [], RULES)[0] == "calm"


class TestRulesFile:
    def test_shipped_rules_file_is_valid(self):
        assert validate_rules() == []

    def test_shipped_rules_only_use_known_moods(self):
        valid = {m.value for m in MoodEnum}
        assert {mood for moods in TAG_MOOD_RULES.values() for mood in moods} <= valid

    @pytest.mark.parametrize("genre", sorted(GENRE_RULES))
    def test_every_genre_alone_gives_a_mood(self, genre):
        # ~8% of albums have no style on Discogs: their genre is the only source
        assert compute_moods([], [genre], TAG_MOOD_RULES)

    def test_no_tag_is_both_style_and_genre(self):
        assert not set(STYLE_RULES) & set(GENRE_RULES)

    @pytest.mark.parametrize("styles, genres, expected", [
        ({"Cool Jazz": {"calm": 3}}, {"Cool Jazz": {"calm": 1}}, "both a style and a genre"),
        ({"X": {"unknown": 2}}, {}, "unknown mood"),
        ({"X": {"calm": 4}}, {}, "weight"),
        ({"X": {"calm": 0}}, {}, "weight"),
        ({"X": {}}, {}, "no mood"),
        ({"X": {"sad": 2, "melancholic": 2}}, {}, "mutually exclusive"),
        ({"": {"calm": 2}}, {}, "characters"),
        ({"x" * 101: {"calm": 2}}, {}, "characters"),
    ])
    def test_invalid_rules_are_reported(self, styles, genres, expected):
        errors = validate_rules(styles, genres)
        assert any(expected in error for error in errors), errors


def make_service(albums, curated=frozenset(), rules=None):
    repository = AsyncMock()
    repository.load_rules = AsyncMock(return_value=rules if rules is not None else RULES)
    repository.mood_ids_by_name = AsyncMock(return_value={m.value: i for i, m in enumerate(MoodEnum, 1)})
    repository.list_enriched_albums = AsyncMock(return_value=albums)
    repository.album_ids_with_curated_moods = AsyncMock(return_value=set(curated))
    return MoodAssignmentService(repository), repository


MOOD_ID = {m.value: i for i, m in enumerate(MoodEnum, 1)}


class TestAssign:
    async def test_assigns_rule_moods_and_reports(self):
        service, repository = make_service([
            (1, ["Cool Jazz"], ["Jazz"]),
            (2, ["Mystery Style"], []),
        ])

        report = await service.assign()

        repository.replace_rule_moods.assert_awaited_once_with({
            1: [MOOD_ID["calm"], MOOD_ID["laid_back"]],
            2: [],
        })
        assert (report.albums, report.with_moods, report.without_moods) == (2, 1, 1)
        assert report.mood_counts == Counter({"calm": 1, "laid_back": 1})
        assert report.uncovered_styles == Counter({"Mystery Style": 1})

    async def test_curated_albums_are_never_touched(self):
        service, repository = make_service([(1, ["Cool Jazz"], []), (2, ["Modal"], [])], curated={1})

        report = await service.assign()

        written = repository.replace_rule_moods.await_args.args[0]
        assert 1 not in written and 2 in written
        assert report.skipped_curated == 1

    async def test_dry_run_writes_nothing(self):
        service, repository = make_service([(1, ["Cool Jazz"], [])])

        report = await service.assign(dry_run=True)

        repository.replace_rule_moods.assert_not_called()
        assert report.with_moods == 1

    async def test_rules_override_skips_the_database_rules(self):
        service, repository = make_service([(1, ["Hint"], [])])

        report = await service.assign(dry_run=True, rules={"Hint": {"happy": 3}})

        repository.load_rules.assert_not_called()
        assert report.mood_counts == Counter({"happy": 1})

    async def test_limited_to_given_albums(self):
        service, repository = make_service([(7, ["Cool Jazz"], [])])

        await service.assign([7])

        repository.list_enriched_albums.assert_awaited_once_with([7])

    async def test_sync_rules_writes_every_tag_mood_pair(self):
        service, repository = make_service([])

        written = await service.sync_rules({"B": {"calm": 2}, "A": {"dark": 3, "calm": 1}})

        assert written == 3
        rows = repository.replace_rules.await_args.args[0]
        assert rows == [
            {"tag": "A", "mood_id": MOOD_ID["calm"], "weight": 1},
            {"tag": "A", "mood_id": MOOD_ID["dark"], "weight": 3},
            {"tag": "B", "mood_id": MOOD_ID["calm"], "weight": 2},
        ]

    async def test_sync_rules_refuses_an_invalid_file(self):
        service, repository = make_service([])

        with patch("app.services.mood_assignment_service.validate_rules", return_value=["bad"]):
            with pytest.raises(ValueError):
                await service.sync_rules()
        repository.replace_rules.assert_not_called()


def patched_session(module):
    session = AsyncMock()
    session.__aenter__.return_value = session
    return patch.object(module, "AsyncSessionLocal", return_value=session), session


class TestCli:
    def test_from_file_requires_dry_run(self):
        with pytest.raises(SystemExit):
            assign_cli.parse_args(["--from-file"])
        assert assign_cli.parse_args(["--from-file", "--dry-run"]).from_file

    def test_report_lists_uncovered_styles(self):
        report = MoodAssignmentReport(albums=3, with_moods=2, without_moods=1,
                                      mood_counts=Counter(calm=2), uncovered_styles=Counter({"Dancehall": 4}))
        text = assign_cli.format_report(report)
        assert "3 enriched" in text and "calm 2" in text and "Dancehall" in text

    async def test_assign_cli_commits_unless_dry_run(self):
        patcher, session = patched_session(assign_cli)
        service = AsyncMock()
        service.assign = AsyncMock(return_value=MoodAssignmentReport())
        with patcher, patch.object(assign_cli, "MoodAssignmentService", return_value=service), \
                patch.object(assign_cli, "MoodAssignmentRepository"):
            await assign_cli.run(assign_cli.parse_args([]))
            session.commit.assert_awaited_once()
            session.commit.reset_mock()
            await assign_cli.run(assign_cli.parse_args(["--dry-run", "--from-file"]))
            session.commit.assert_not_called()
            assert service.assign.await_args.kwargs["rules"] is TAG_MOOD_RULES

    async def test_sync_cli_dry_run_validates_without_writing(self, capsys):
        patcher, session = patched_session(sync_cli)
        with patcher:
            assert await sync_cli.run(sync_cli.parse_args(["--dry-run"])) == 0
        session.commit.assert_not_called()
        assert "valid" in capsys.readouterr().out

    async def test_sync_cli_rejects_invalid_file(self):
        with patch.object(sync_cli, "validate_rules", return_value=["bad rule"]):
            assert await sync_cli.run(sync_cli.parse_args([])) == 1

    async def test_sync_cli_writes_and_commits(self):
        patcher, session = patched_session(sync_cli)
        service = AsyncMock()
        service.sync_rules = AsyncMock(return_value=10)
        with patcher, patch.object(sync_cli, "MoodAssignmentService", return_value=service), \
                patch.object(sync_cli, "MoodAssignmentRepository"):
            assert await sync_cli.run(sync_cli.parse_args([])) == 0
        session.commit.assert_awaited_once()
