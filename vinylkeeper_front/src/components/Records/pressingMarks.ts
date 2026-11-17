import { parse } from "date-fns";
import { formatDate } from "@utils/i18n";

/** Release date as Discogs knows it: "17 May 2013", "May 2013" or "2013" (in the locale of the device). */
export function releasedLabel(released?: string | null): string | null {
  if (!released) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(released)) return formatDate(parse(released, "yyyy-MM-dd", new Date()));
  if (/^\d{4}-\d{2}$/.test(released)) return formatDate(parse(released, "yyyy-MM", new Date()), { month: "short", year: "numeric" });
  return released;
}
