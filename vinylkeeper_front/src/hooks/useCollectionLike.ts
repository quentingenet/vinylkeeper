import { useMutation, useQueryClient } from "@tanstack/react-query";
import { collectionApiService } from "@services/CollectionApiService";
import { queryKeys } from "@utils/queryKeys";

export function useCollectionLike(collectionId: number) {
  const queryClient = useQueryClient();
  const likeMutation = useMutation({
    mutationFn: () => collectionApiService.likeCollection(collectionId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.collections.detail(collectionId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.collections.all() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.collections.public.all() }),
      ]);
    },
    onError: (error) => {
      console.error("Error liking collection:", error);
    },
  });

  const unlikeMutation = useMutation({
    mutationFn: () => collectionApiService.unlikeCollection(collectionId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.collections.detail(collectionId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.collections.all() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.collections.public.all() }),
      ]);
    },
    onError: (error) => {
      console.error("Error unliking collection:", error);
    },
  });

  return {
    like: likeMutation.mutate,
    unlike: unlikeMutation.mutate,
    isLiking: likeMutation.isPending,
    isUnliking: unlikeMutation.isPending,
    likeError: likeMutation.error,
    unlikeError: unlikeMutation.error,
  };
}
