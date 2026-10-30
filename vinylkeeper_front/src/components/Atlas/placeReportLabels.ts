import type { PlaceReportIssue } from "@services/AdminApiService";

/** What a member can tick when reporting a spot, in this order */
export const PLACE_REPORT_ISSUES: { value: PlaceReportIssue; label: string }[] = [
  { value: "name", label: "Name is wrong" },
  { value: "description", label: "Description is wrong or outdated" },
  { value: "address", label: "Address is wrong, or the spot has moved" },
  { value: "website", label: "Website link is dead or outdated" },
  { value: "type", label: "Spot type is wrong" },
  { value: "closed", label: "Permanently closed" },
];

export const REPORT_COMMENT_MAX_LENGTH = 500;

/** Short label of an issue, for chips in the admin panel */
export function issueChipLabel(issue: PlaceReportIssue): string {
  const short: Record<PlaceReportIssue, string> = {
    name: "Name",
    description: "Description",
    address: "Address",
    website: "Website",
    type: "Type",
    closed: "Closed",
  };
  return short[issue];
}
