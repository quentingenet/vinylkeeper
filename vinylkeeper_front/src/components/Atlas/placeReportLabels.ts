import type { PlaceReportIssue } from "@services/AdminApiService";
import i18n from "@utils/i18n";

/** What a member can tick when reporting a spot, in this order */
export const PLACE_REPORT_ISSUES: PlaceReportIssue[] = ["name", "description", "address", "website", "type", "closed"];

/** What the member reads next to an issue they can tick */
export const issueLabel = (issue: PlaceReportIssue): string => i18n.t(`atlas:report.issues.${issue}`);

/** "flea market" -> "Flea market", in the language of the interface (a type the app does not know: as it comes) */
export function placeTypeLabel(name: string): string {
  return i18n.t(`atlas:types.${name}`, { defaultValue: name.charAt(0).toUpperCase() + name.slice(1) });
}

/** Short label of an issue, for chips in the admin panel */
export function issueChipLabel(issue: PlaceReportIssue): string {
  return i18n.t(`atlas:report.chips.${issue}`);
}
