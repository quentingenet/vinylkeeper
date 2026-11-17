import { useEffect } from "react";
import { titleToRestore } from "@utils/i18n";

export const useDocumentTitle = (title: string | null | undefined) => {
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = titleToRestore(previous);
    };
  }, [title]);
};
