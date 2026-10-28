/** "laid_back" -> "Laid back" */
export function formatMoodName(mood: string): string {
  const words = mood.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** 1970 -> "1970s" */
export function formatDecade(decade: number): string {
  return `${decade}s`;
}

/** Album titles are stored as "Artist - Title": keep the title part. */
export function albumTitleOnly(title: string | null): string {
  if (!title) return "";
  const separator = title.indexOf(" - ");
  return separator === -1 ? title : title.slice(separator + 3);
}
