import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { isApiError } from "@utils/apiError";
import { logger } from "@utils/logger";
import { discogsOutcomeUrl, type AppLinkTarget } from "@utils/NativeLinks";
import { discogsImportApiService } from "@services/DiscogsImportApiService";

type DiscogsReturn = Extract<AppLinkTarget, { kind: "discogs-authorized" | "discogs-denied" }>;

/**
 * The native app is back from Discogs (App Link on Android, sign-in sheet on iOS): its own session finishes the
 * connection, then the import dialog tells how it ended.
 */
export function useFinishDiscogsConnection() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useCallback(
    async (target: DiscogsReturn, isActive: () => boolean = () => true) => {
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
      if (isActive()) void navigate(discogsOutcomeUrl(outcome));
    },
    [navigate, queryClient],
  );
}
