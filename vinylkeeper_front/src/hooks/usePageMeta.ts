import { useEffect } from "react";

// Address of the site in production: canonical URLs are absolute
export const SITE_URL = "https://vinylkeeper.org";

export interface PageMeta {
  title?: string;
  description?: string;
  /** Path of the page Google should index for this URL ("/", "/atlas") */
  canonicalPath?: string;
  /** Pages tied to an email link (reset password, confirm email): kept out of search engines */
  noIndex?: boolean;
}

function headElement<T extends HTMLElement>(selector: string, create: () => T): T {
  return (document.head.querySelector(selector) as T | null) ?? document.head.appendChild(create());
}

/**
 * Title, description, canonical URL and indexing of a page seen by visitors and search engines.
 * The app is a single page: index.html is the same for every URL, so each public page sets its
 * own while it is shown, and the previous values come back when it is left.
 */
export function usePageMeta({ title, description, canonicalPath, noIndex = false }: PageMeta): void {
  useEffect(() => {
    const restore: Array<() => void> = [];

    if (title) {
      const previous = document.title;
      document.title = title;
      restore.push(() => { document.title = previous; });
    }

    const setMeta = (name: string, content: string) => {
      const meta = headElement(`meta[name="${name}"]`, () => {
        const element = document.createElement("meta");
        element.name = name;
        return element;
      });
      const previous = meta.getAttribute("content");
      meta.setAttribute("content", content);
      restore.push(() => {
        if (previous === null) meta.remove();
        else meta.setAttribute("content", previous);
      });
    };
    if (description) setMeta("description", description);
    if (noIndex) setMeta("robots", "noindex, nofollow");

    if (canonicalPath) {
      const link = headElement('link[rel="canonical"]', () => {
        const element = document.createElement("link");
        element.rel = "canonical";
        return element;
      });
      const previous = link.getAttribute("href");
      link.setAttribute("href", `${SITE_URL}${canonicalPath === "/" ? "" : canonicalPath}`);
      restore.push(() => {
        if (previous === null) link.remove();
        else link.setAttribute("href", previous);
      });
    }

    return () => restore.reverse().forEach((undo) => undo());
  }, [title, description, canonicalPath, noIndex]);
}
