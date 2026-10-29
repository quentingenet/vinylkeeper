import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { EGlobalUrls } from "@utils/GlobalUrls";

export const usePageTitle = (setTitlePage?: (title: string) => void) => {
  const location = useLocation();

  useEffect(() => {
    if (!setTitlePage) return;

    const pathToTitle: Record<string, string> = {
      [EGlobalUrls.ROOT]: "Dashboard",
      [EGlobalUrls.DASHBOARD]: "Dashboard",
      [EGlobalUrls.COLLECTIONS]: "Collections",
      [EGlobalUrls.SPINNING_NOW]: "Spinning now",
      [EGlobalUrls.ADD_VINYLS]: "Add a record",
      [EGlobalUrls.ATLAS]: "Vinyl Atlas",
      [EGlobalUrls.SETTINGS]: "Settings",
      [EGlobalUrls.ADMIN]: "Admin",
      [EGlobalUrls.CONFIRM_EMAIL]: "Email confirmation",
    };

    const title = pathToTitle[location.pathname] || "Vinyl Keeper";
    setTitlePage(title);
  }, [location.pathname, setTitlePage]);
};
