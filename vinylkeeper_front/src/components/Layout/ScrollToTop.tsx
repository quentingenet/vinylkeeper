import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Opens every page at its top. The window keeps its scroll position between routes, so a page
 * opened from the bottom of a long one (the pagination of a collection, for instance) started at the bottom.
 * Only a change of page counts: moving through the pages of a list (the query string) keeps its own behavior.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}
