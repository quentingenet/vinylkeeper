"""
Rule-based album moods: free, deterministic and explainable.

Each album gets up to MAX_MOODS moods from the weights of its Discogs styles
(genres are only a fallback when no style has a rule). Moods set by the LLM or
a user always win: their albums are never touched by rules.
"""
from collections import Counter
from dataclasses import dataclass, field
from typing import Iterable, Optional

from app.core.enums import MoodEnum
from app.data.tag_mood_rules import GENRE_RULES, STYLE_RULES, TAG_MOOD_RULES
from app.repositories.mood_assignment_repository import MoodAssignmentRepository

MAX_MOODS = 3
MIN_SCORE = 2
MAX_TAG_LENGTH = 100
# Mutually exclusive nuances (see the mood descriptions): keep the stronger one
EXCLUSIVE_PAIRS = (("sad", "melancholic"),)


def compute_moods(
    styles: list[str], genres: list[str], rules: dict[str, dict[str, int]],
    max_moods: int = MAX_MOODS, min_score: int = MIN_SCORE,
) -> list[str]:
    """Strongest moods first; ties are broken by name so results are stable."""
    scores: Counter[str] = Counter()
    for tag in styles:
        scores.update(rules.get(tag, {}))
    # Genres only help when styles alone are not conclusive (no rule, or weak hints only)
    if not any(score >= min_score for score in scores.values()):
        for tag in genres:
            scores.update(rules.get(tag, {}))

    for first, second in EXCLUSIVE_PAIRS:
        if first in scores and second in scores:
            del scores[second if scores[first] >= scores[second] else first]

    ranked = sorted((mood for mood, score in scores.items() if score >= min_score),
                    key=lambda mood: (-scores[mood], mood))
    return ranked[:max_moods]


def validate_rules(
    style_rules: dict[str, dict[str, int]] = STYLE_RULES,
    genre_rules: dict[str, dict[str, int]] = GENRE_RULES,
) -> list[str]:
    """Problems in the rules file; an empty list means it can be synced."""
    errors = [f"'{tag}' is both a style and a genre rule" for tag in sorted(set(style_rules) & set(genre_rules))]
    valid_moods = {mood.value for mood in MoodEnum}
    for tag, moods in {**genre_rules, **style_rules}.items():
        if not tag.strip() or len(tag) > MAX_TAG_LENGTH:
            errors.append(f"'{tag}': tag must be 1-{MAX_TAG_LENGTH} characters")
        if not moods:
            errors.append(f"'{tag}': no mood")
        for mood, weight in moods.items():
            if mood not in valid_moods:
                errors.append(f"'{tag}': unknown mood '{mood}'")
            if not isinstance(weight, int) or not 1 <= weight <= 3:
                errors.append(f"'{tag}': weight of '{mood}' must be 1, 2 or 3")
        if set(moods) >= {"sad", "melancholic"}:
            errors.append(f"'{tag}': sad and melancholic are mutually exclusive")
    return errors


@dataclass
class MoodAssignmentReport:
    albums: int = 0
    with_moods: int = 0
    without_moods: int = 0
    skipped_curated: int = 0
    mood_counts: Counter = field(default_factory=Counter)
    uncovered_styles: Counter = field(default_factory=Counter)


class MoodAssignmentService:
    def __init__(self, repository: MoodAssignmentRepository):
        self.repository = repository

    async def sync_rules(self, rules: dict[str, dict[str, int]] = TAG_MOOD_RULES) -> int:
        """Replace tag_mood_rules with the rules file. Returns the number of rows."""
        errors = validate_rules()
        if errors:
            raise ValueError("Invalid mood rules:\n" + "\n".join(errors))
        mood_ids = await self.repository.mood_ids_by_name()
        rows = [
            {"tag": tag, "mood_id": mood_ids[mood], "weight": weight}
            for tag, moods in sorted(rules.items())
            for mood, weight in sorted(moods.items())
        ]
        await self.repository.replace_rules(rows)
        return len(rows)

    async def assign(
        self, album_ids: Optional[Iterable[int]] = None, dry_run: bool = False,
        rules: Optional[dict[str, dict[str, int]]] = None,
    ) -> MoodAssignmentReport:
        """
        (Re)compute rule moods of enriched albums: all of them, or only album_ids.
        `rules` overrides the database rules (preview of the rules file before syncing).
        """
        report = MoodAssignmentReport()
        rules = rules if rules is not None else await self.repository.load_rules()
        mood_ids = await self.repository.mood_ids_by_name()
        albums = await self.repository.list_enriched_albums(album_ids)
        curated = await self.repository.album_ids_with_curated_moods(album_id for album_id, _, _ in albums)

        moods_by_album: dict[int, list[int]] = {}
        for album_id, styles, genres in albums:
            report.albums += 1
            if album_id in curated:
                report.skipped_curated += 1
                continue
            moods = compute_moods(styles, genres, rules)
            moods_by_album[album_id] = [mood_ids[mood] for mood in moods]
            report.mood_counts.update(moods)
            report.uncovered_styles.update(style for style in styles if style not in rules)
            if moods:
                report.with_moods += 1
            else:
                report.without_moods += 1

        if not dry_run:
            await self.repository.replace_rule_moods(moods_by_album)
        return report
