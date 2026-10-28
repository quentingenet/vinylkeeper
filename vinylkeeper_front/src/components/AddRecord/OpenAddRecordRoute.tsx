import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAddRecord } from "@contexts/AddRecordContext";
import { EGlobalUrls } from "@utils/GlobalUrls";
import { parseInitialQuery, parseReplaceTarget } from "@utils/findPressing";

/**
 * /add-vinyls used to be a page: bookmarks and older links now open the add dialog over
 * the dashboard, with their search (q) and replacement target if any.
 */
export default function OpenAddRecordRoute() {
  const { openAddRecord } = useAddRecord();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    openAddRecord({
      initialQuery: parseInitialQuery(searchParams) || undefined,
      replaceTarget: parseReplaceTarget(searchParams) ?? undefined,
    });
    void navigate(EGlobalUrls.DASHBOARD, { replace: true });
    // Once, on arrival
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
