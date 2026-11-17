import type { BreakdownEntry } from "@models/IDashboardStats";
import type { BarEntry } from "@components/Dashboard/BreakdownBarChart";
import i18n from "@utils/i18n";

export const TOP_GENRES = 10;
// The label of the bar summing the rest, in the language of the interface
export const othersLabel = (): string => i18n.t("dashboard:statsCard.others");

/** The most frequent genres, the rest summed in one "Others" bar that leads nowhere. */
export function topWithOthers(entries: BreakdownEntry[], max: number = TOP_GENRES): BarEntry[] {
  if (entries.length <= max) return entries.map(({ label, count }) => ({ label, count }));
  const others = entries.slice(max - 1).reduce((sum, entry) => sum + entry.count, 0);
  return [
    ...entries.slice(0, max - 1).map(({ label, count }) => ({ label, count })),
    { label: othersLabel(), count: others, disabled: true },
  ];
}

/** 3 of 7 -> "43%" */
export function percentOf(count: number, total: number): string {
  return total > 0 ? `${Math.round((count / total) * 100)}%` : "0%";
}
