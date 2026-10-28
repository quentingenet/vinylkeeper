import { useMutation, useQueryClient } from "@tanstack/react-query";
import { externalReferenceApiService } from "@services/ExternalReferenceService";
import type { IAlbumRequestResults } from "@models/IRequestProxy";
import type { ReplaceTarget } from "@utils/findPressing";
import { queryKeys } from "@utils/queryKeys";
import { logger } from "@utils/logger";

export function useReplacePressing(target: ReplaceTarget | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pressing: IAlbumRequestResults) => {
      if (!target) throw new Error("No album to replace");
      return externalReferenceApiService.replacePressing(target.collectionId, target.albumId, {
        external_id: pressing.id,
        entity_type: "album",
        title: pressing.title || "",
        image_url: pressing.picture || "",
        source: "discogs",
      });
    },
    onSuccess: async () => {
      if (!target) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.collections.detail(target.collectionId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.collections.albums(target.collectionId) }),
      ]);
    },
    onError: (error) => logger.error("Error replacing pressing:", error),
  });
}
