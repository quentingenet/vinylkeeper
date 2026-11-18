import { useState } from "react";
import { isApiError } from "@utils/apiError";

/** What the lists of member reports of the admin panel share, apart from their components (AdminReportList). */

export const REPORTS_PAGE_SIZE = 10;

export type ReportFilter = "open" | "all";
export type Feedback = { severity: "success" | "error"; message: string } | null;

/** The message shown after an action of the admin, success or the reason of a refusal */
export function useReportFeedback() {
  const [feedback, setFeedback] = useState<Feedback>(null);
  return {
    feedback,
    clear: () => setFeedback(null),
    succeeded: (message: string) => setFeedback({ severity: "success", message }),
    failed: (fallback: string) => (error: unknown) =>
      setFeedback({ severity: "error", message: isApiError(error) ? error.message : fallback }),
  };
}

