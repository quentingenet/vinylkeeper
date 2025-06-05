import { useMutation, useQueryClient } from "@tanstack/react-query";
import { collectionApiService } from "@services/CollectionApiService";

export function useCollectionLike(collectionId: number) {
  const queryClient = useQueryClient();

  const likeMutation = useMutation({
    mutationFn: () => collectionApiService.likeCollection(collectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["publicCollections"] });
      queryClient.invalidateQueries({
        queryKey: ["collectionDetails", collectionId],
      });
    },
  });

  const unlikeMutation = useMutation({
    mutationFn: () => collectionApiService.unlikeCollection(collectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["publicCollections"] });
      queryClient.invalidateQueries({
        queryKey: ["collectionDetails", collectionId],
      });
    },
  });

  return {
    like: likeMutation.mutate,
    unlike: unlikeMutation.mutate,
    isLiking: likeMutation.isPending,
    isUnliking: unlikeMutation.isPending,
  };
}
