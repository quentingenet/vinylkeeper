import { useEffect } from "react";

/**
 * A page of a paginated list that has just been emptied (its last item removed, or moved to a collection)
 * shows nothing, and tab changes do not move it: goes back to the last page that still exists.
 *
 * `itemCount` is the number of items of the page once loaded; undefined while loading or when the list is
 * not on screen, which never counts as empty. `totalPages` is the page count the server reports.
 */
export function useLastPageWhenEmpty(
  page: number,
  setPage: (page: number) => void,
  itemCount: number | undefined,
  totalPages: number | undefined
): void {
  useEffect(() => {
    if (itemCount === 0 && page > 1) {
      setPage(Math.max(1, Math.min(page - 1, totalPages || 1)));
    }
  }, [itemCount, page, totalPages, setPage]);
}
