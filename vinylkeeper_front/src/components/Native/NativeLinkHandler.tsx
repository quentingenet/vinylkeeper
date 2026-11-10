import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { isCapacitorPlatform } from "@utils/CapacitorUtils";
import { isApiError } from "@utils/apiError";
import { logger } from "@utils/logger";
import { discogsOutcomeUrl, parseAppLink } from "@utils/NativeLinks";
import { discogsImportApiService } from "@services/DiscogsImportApiService";

/**
 * In the Android app, the links of vinylkeeper.org open the app (App Links): a shared collection
 * goes to its page, and the return from Discogs finishes the connection with the app's own session
 * (the browser that showed the Discogs page has none). Renders nothing, and does nothing in a browser.
 */
export default function NativeLinkHandler() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
      if (target.kind === "discogs-denied") {
        void navigate(discogsOutcomeUrl("denied"));
        return;
      }
      let outcome = "connected";
      try {
        await discogsImportApiService.completeConnection(target.oauthToken, target.oauthVerifier);
        await queryClient.invalidateQueries({ queryKey: ["discogsImport"] });
      } catch (error) {
        // The reason of a refused authorization (expired, session...) is what the dialog tells
        const reason = isApiError(error) ? error.details?.reason : undefined;
        outcome = typeof reason === "string" ? reason : "error";
        logger.warn("Discogs connection not completed:", error);
      }
      if (active) void navigate(discogsOutcomeUrl(outcome));
    };

    const listener = CapacitorApp.addListener("appUrlOpen", ({ url }) => void handle(url));
    void CapacitorApp.getLaunchUrl().then((launch) => {
      if (launch?.url) void handle(launch.url);
    });

    return () => {
      active = false;
      void listener.then((handle) => handle.remove());
    };
  }, [navigate, queryClient]);

  return null;
}
