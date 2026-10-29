import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { discogsImportApiService } from "@services/DiscogsImportApiService";
import { useUserContext } from "@contexts/UserContext";
import { queryKeys } from "@utils/queryKeys";
import { isImportActive, type DiscogsImport } from "@models/IDiscogsImport";
import type { ApiError } from "@utils/apiError";

const POLL_INTERVAL_MS = 2000;

/**
 * The latest Discogs import of the user, read again every 2 seconds while it runs.
 * When it ends, the lists it changed (collections, dashboard, Spinning now) are refreshed.
 */
export function useDiscogsImport() {
  const queryClient = useQueryClient();
  const { currentUser } = useUserContext();
  const queryKey = queryKeys.discogsImport.latest(currentUser?.user_uuid);

  const { data: latestImport, isLoading } = useQuery<DiscogsImport | null, ApiError>({
    queryKey,
    queryFn: () => discogsImportApiService.latest(),
    enabled: !!currentUser?.user_uuid,
    staleTime: 0,
    refetchInterval: (query) => (isImportActive(query.state.data) ? POLL_INTERVAL_MS : false),
  });

  const previousStatus = useRef(latestImport?.status);
  useEffect(() => {
    const wasActive = previousStatus.current === "queued" || previousStatus.current === "running";
    previousStatus.current = latestImport?.status;
    // A failed import removes the empty collection it created: lists are refreshed too
    if (wasActive && (latestImport?.status === "done" || latestImport?.status === "failed")) {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.collections.all() }),
        ...(latestImport.collection_id !== null
          ? [
              queryClient.invalidateQueries({ queryKey: queryKeys.collections.albums(latestImport.collection_id) }),
              queryClient.invalidateQueries({ queryKey: queryKeys.collections.detail(latestImport.collection_id) }),
            ]
          : []),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.spinningNow.all() }),
      ]);
    }
  }, [latestImport, queryClient]);

  const startImport = useMutation<DiscogsImport, ApiError, { discogsUsername: string; collectionId: number | null; saveCopy: boolean }>({
    mutationFn: ({ discogsUsername, collectionId, saveCopy }) =>
      discogsImportApiService.start(discogsUsername, collectionId, saveCopy),
    onSuccess: (job) => {
      queryClient.setQueryData(queryKey, job);
      // A new collection may have been created for the records
      void queryClient.invalidateQueries({ queryKey: queryKeys.collections.all() });
    },
  });

  return { latestImport: latestImport ?? null, isLoading, startImport };
}
