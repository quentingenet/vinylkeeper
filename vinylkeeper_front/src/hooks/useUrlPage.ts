import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Page number of a paginated list, kept in the URL: back from a detail page, the browser
 * or Android back button returns to the same page. Page 1 leaves the URL clean.
 */
export function useUrlPage(param: string): [number, (page: number) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const parsed = Number(searchParams.get(param));
  const page = Number.isInteger(parsed) && parsed > 1 ? parsed : 1;

  const setPage = useCallback(
    (nextPage: number) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          if (nextPage > 1) {
            next.set(param, String(nextPage));
          } else {
            next.delete(param);
          }
          return next;
        },
        // Changing page replaces the entry: back leaves the list instead of stepping through pages
        { replace: true }
      );
    },
    [param, setSearchParams]
  );

  return [page, setPage];
}
