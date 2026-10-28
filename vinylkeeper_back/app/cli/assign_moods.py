"""
(Re)compute rule-based moods for every enriched album. Idempotent: run it again
after each rules change. Moods set by the LLM or a user are never overridden.

Usage (from vinylkeeper_back/):
    poetry run python -m app.cli.assign_moods [--dry-run] [--from-file]

    --dry-run    compute and print the report, write nothing
    --from-file  use app/data/tag_mood_rules.py instead of the synced table (preview)
"""
import argparse
import asyncio

from app.data.tag_mood_rules import TAG_MOOD_RULES
from app.db.session import AsyncSessionLocal, engine
from app.repositories.mood_assignment_repository import MoodAssignmentRepository
from app.services.mood_assignment_service import MoodAssignmentReport, MoodAssignmentService

TOP_UNCOVERED = 40


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Assign rule-based moods to enriched albums.")
    parser.add_argument("--dry-run", action="store_true", help="Print the report without writing")
    parser.add_argument("--from-file", action="store_true", help="Preview with the rules file, not the table")
    args = parser.parse_args(argv)
    if args.from_file and not args.dry_run:
        parser.error("--from-file is a preview: use it with --dry-run, or sync the rules first")
    return args


def format_report(report: MoodAssignmentReport) -> str:
    lines = [
        f"Albums: {report.albums} enriched, {report.with_moods} with moods, "
        f"{report.without_moods} without, {report.skipped_curated} kept (LLM/user moods)",
        "Moods: " + ", ".join(f"{mood} {count}" for mood, count in report.mood_counts.most_common()),
    ]
    if report.uncovered_styles:
        lines.append(f"Most frequent styles without a rule (top {TOP_UNCOVERED}):")
        lines += [f"  {count:>4}  {style}" for style, count in report.uncovered_styles.most_common(TOP_UNCOVERED)]
    return "\n".join(lines)


async def run(args: argparse.Namespace) -> MoodAssignmentReport:
    async with AsyncSessionLocal() as db:
        service = MoodAssignmentService(MoodAssignmentRepository(db))
        report = await service.assign(dry_run=args.dry_run, rules=TAG_MOOD_RULES if args.from_file else None)
        if not args.dry_run:
            await db.commit()
    print(("[dry run] " if args.dry_run else "") + format_report(report))
    return report


def main(argv: list[str] | None = None) -> None:
    async def _main() -> None:
        try:
            await run(parse_args(argv))
        finally:
            await engine.dispose()

    asyncio.run(_main())


if __name__ == "__main__":
    main()
