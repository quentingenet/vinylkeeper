import { useEffect } from "react";

export const useDocumentTitle = (title: string | null | undefined) => {
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
};
