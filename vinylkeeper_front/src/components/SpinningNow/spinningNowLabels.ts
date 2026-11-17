/** "laid_back" -> "Laid back", in the language of the interface (a mood the app does not know: as it comes) */
import i18n from "@utils/i18n";
export function formatMoodName(mood: string): string {
  const words = mood.replace(/_/g, " ");
  return i18n.t(`moods:${mood}`, { defaultValue: words.charAt(0).toUpperCase() + words.slice(1) });
}

/** 1970 -> "1970s" */
export function formatDecade(decade: number): string {
  return i18n.t("dashboard:decade", { decade });
}

/** Album titles are stored as "Artist - Title": keep the title part. */
export function albumTitleOnly(title: string | null): string {
  if (!title) return "";
  const separator = title.indexOf(" - ");
  return separator === -1 ? title : title.slice(separator + 3);
}
