"""
Sync the tag_mood_rules table with app/data/tag_mood_rules.py (the source of truth).

Usage (from vinylkeeper_back/):
    poetry run python -m app.cli.sync_mood_rules [--dry-run]

Then recompute album moods: poetry run python -m app.cli.assign_moods
"""
import argparse
import asyncio
import sys

from app.data.tag_mood_rules import TAG_MOOD_RULES
from app.db.session import AsyncSessionLocal, engine
from app.repositories.mood_assignment_repository import MoodAssignmentRepository
from app.services.mood_assignment_service import MoodAssignmentService, validate_rules


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Sync tag_mood_rules with the rules file.")
    parser.add_argument("--dry-run", action="store_true", help="Validate the rules file without writing")
    return parser.parse_args(argv)


async def run(args: argparse.Namespace) -> int:
    errors = validate_rules()
    if errors:
        print("Invalid rules file:\n  " + "\n  ".join(errors))
        return 1
    rows = sum(len(moods) for moods in TAG_MOOD_RULES.values())
    if args.dry_run:
        print(f"Rules file is valid: {len(TAG_MOOD_RULES)} tags, {rows} tag/mood rows (nothing written)")
        return 0
    async with AsyncSessionLocal() as db:
        written = await MoodAssignmentService(MoodAssignmentRepository(db)).sync_rules()
        await db.commit()
    print(f"tag_mood_rules synced: {len(TAG_MOOD_RULES)} tags, {written} rows. "
          f"Now run: python -m app.cli.assign_moods")
    return 0


def main(argv: list[str] | None = None) -> None:
    async def _main() -> int:
        try:
            return await run(parse_args(argv))
        finally:
            await engine.dispose()

    sys.exit(asyncio.run(_main()))


if __name__ == "__main__":
    main()
