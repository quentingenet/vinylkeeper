import { format, parse } from "date-fns";

/** Release date as Discogs knows it: "17 May 2013", "May 2013" or "2013". */
export function releasedLabel(released?: string | null): string | null {
  if (!released) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(released)) return format(parse(released, "yyyy-MM-dd", new Date()), "d MMM yyyy");
  if (/^\d{4}-\d{2}$/.test(released)) return format(parse(released, "yyyy-MM", new Date()), "MMM yyyy");
  return released;
}
