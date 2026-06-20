import { logger } from "@utils/logger";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { placeApiService, Place } from "@services/PlaceApiService";
import { queryKeys } from "@utils/queryKeys";

export function usePlaceLike(
  placeId: number,
  onError?: (error: Error) => void
) {
  const queryClient = useQueryClient();

  const updateLocationCache = (isLiked: boolean, delta: number) => {
    queryClient.setQueriesData<Place[]>(
      { queryKey: queryKeys.places.allByLocation() },
      (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((p) =>
          p.id === placeId
            ? { ...p, is_liked: isLiked, likes_count: Math.max(0, p.likes_count + delta) }
            : p
        );
      }
    );
  };

  const likeMutation = useMutation({
    mutationFn: () => placeApiService.likePlace(placeId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.places.allByLocation() });
      const snapshots = queryClient.getQueriesData<Place[]>({
        queryKey: queryKeys.places.allByLocation(),
      });
      updateLocationCache(true, +1);
      return { snapshots };
    },
    onError: (error, _vars, context) => {
      if (context?.snapshots) {
        context.snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data));
      }
      logger.error("Error liking place:", error);
      onError?.(error);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.places.allByLocation() });
    },
  });

  const unlikeMutation = useMutation({
    mutationFn: () => placeApiService.unlikePlace(placeId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.places.allByLocation() });
      const snapshots = queryClient.getQueriesData<Place[]>({
        queryKey: queryKeys.places.allByLocation(),
      });
      updateLocationCache(false, -1);
      return { snapshots };
    },
    onError: (error, _vars, context) => {
      if (context?.snapshots) {
        context.snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data));
      }
      logger.error("Error unliking place:", error);
      onError?.(error);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.places.allByLocation() });
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
