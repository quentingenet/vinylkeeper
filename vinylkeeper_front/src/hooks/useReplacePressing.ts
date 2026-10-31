import { useMutation, useQueryClient } from "@tanstack/react-query";
import { externalReferenceApiService } from "@services/ExternalReferenceService";
import type { IAlbumRequestResults } from "@models/IRequestProxy";
import type { ReplaceTarget } from "@utils/findPressing";
import { queryKeys } from "@utils/queryKeys";
import { applyCollectionAlbum } from "@utils/collectionCache";
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
    // The pressing picked shows on the card at once, in the grid and in a search alike
    onSuccess: async (album) => {
      if (!target) return;
      await Promise.all([
        applyCollectionAlbum(queryClient, target.collectionId, target.albumId, album),
        queryClient.invalidateQueries({ queryKey: queryKeys.metadata.album(album.external_album_id) }),
      ]);
    },
    onError: (error) => logger.error("Error replacing pressing:", error),
  });
}
