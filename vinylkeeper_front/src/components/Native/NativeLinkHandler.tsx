import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { isCapacitorPlatform } from "@utils/CapacitorUtils";
import { parseAppLink } from "@utils/NativeLinks";
import { useFinishDiscogsConnection } from "@hooks/useFinishDiscogsConnection";

/**
 * In the Android app, the links of vinylkeeper.org open the app (App Links): a shared collection
 * goes to its page, and the return from Discogs finishes the connection with the app's own session
 * (the browser that showed the Discogs page has none). Renders nothing, and does nothing in a browser.
 */
export default function NativeLinkHandler() {
  const navigate = useNavigate();
  const finishDiscogsConnection = useFinishDiscogsConnection();
  // The link that started the app can be reported twice (launch URL, then the event)
  const lastHandled = useRef<string | null>(null);

  useEffect(() => {
    if (!isCapacitorPlatform()) return;
    let active = true;

    const handle = async (url: string) => {
      if (lastHandled.current === url) return;
      const target = parseAppLink(url);
      if (!target) return;
      lastHandled.current = url;

      if (target.kind === "page") {
        void navigate(target.path);
        return;
      }

      // The authorization page (a Custom Tab) is still open over the app
      await Browser.close().catch(() => undefined);
      await finishDiscogsConnection(target, () => active);
    };

    const listener = CapacitorApp.addListener(
      "appUrlOpen",
      ({ url }) => void handle(url),
    );
    void CapacitorApp.getLaunchUrl().then((launch) => {
      if (launch?.url) void handle(launch.url);
    });

    return () => {
      active = false;
      void listener.then((handle) => handle.remove());
    };
  }, [navigate, finishDiscogsConnection]);

  return null;
}
