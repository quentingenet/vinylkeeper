import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { EGlobalUrls } from "@utils/GlobalUrls";

/** Translation key of the title of the page the route shows, in the nav namespace */
export const usePageTitle = (setTitlePage?: (titleKey: string) => void) => {
  const location = useLocation();

  useEffect(() => {
    if (!setTitlePage) return;

    const pathToTitle: Record<string, string> = {
      [EGlobalUrls.ROOT]: "nav:items.dashboard",
      [EGlobalUrls.DASHBOARD]: "nav:items.dashboard",
      [EGlobalUrls.COLLECTIONS]: "nav:items.collections",
      [EGlobalUrls.SPINNING_NOW]: "nav:items.spinningNow",
      [EGlobalUrls.ADD_VINYLS]: "nav:items.addRecord",
      [EGlobalUrls.ATLAS]: "nav:items.vinylAtlas",
      [EGlobalUrls.SETTINGS]: "nav:items.settings",
      [EGlobalUrls.ADMIN]: "nav:items.admin",
      [EGlobalUrls.CONFIRM_EMAIL]: "nav:items.emailConfirmation",
    };

    const title = pathToTitle[location.pathname] || "nav:brand";
    setTitlePage(title);
  }, [location.pathname, setTitlePage]);
};
