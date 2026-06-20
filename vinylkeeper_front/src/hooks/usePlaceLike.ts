import { logger } from "@utils/logger";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { placeApiService } from "@services/PlaceApiService";
import { queryKeys } from "@utils/queryKeys";

export function usePlaceLike(
  placeId: number,
  onError?: (error: Error) => void
) {
  const queryClient = useQueryClient();
  const invalidatePlaceQueries = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.places.detail(placeId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.places.all() });
    void queryClient.invalidateQueries({ queryKey: queryKeys.places.allByLocation() });
  };

  const likeMutation = useMutation({
    mutationFn: () => placeApiService.likePlace(placeId),
    onSuccess: invalidatePlaceQueries,
    onError: (error) => {
      logger.error("Error liking place:", error);
      onError?.(error);
    },
  });

  const unlikeMutation = useMutation({
    mutationFn: () => placeApiService.unlikePlace(placeId),
    onSuccess: invalidatePlaceQueries,
    onError: (error) => {
      logger.error("Error unliking place:", error);
      onError?.(error);
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
