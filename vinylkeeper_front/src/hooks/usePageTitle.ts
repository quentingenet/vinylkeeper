import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { EGlobalUrls } from "@utils/GlobalUrls";

interface UsePageTitleProps {
  setTitlePage: (title: string) => void;
}

export const usePageTitle = (setTitlePage?: (title: string) => void) => {
  const location = useLocation();

  useEffect(() => {
    if (!setTitlePage) return;

    const pathToTitle: Record<string, string> = {
      [EGlobalUrls.ROOT]: "Dashboard",
      [EGlobalUrls.DASHBOARD]: "Dashboard",
      [EGlobalUrls.COLLECTIONS]: "Collections",
      [EGlobalUrls.ADD_VINYLS]: "Add vinyls",
      [EGlobalUrls.EXPLORE]: "Explore",
      [EGlobalUrls.PLACES]: "Places",
      [EGlobalUrls.SETTINGS]: "Settings",
      [EGlobalUrls.ADMIN]: "Admin",
    };

    const title = pathToTitle[location.pathname] || "Vinyl Keeper";
    setTitlePage(title);
  }, [location.pathname, setTitlePage]);
};
