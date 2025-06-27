import { useMutation, useQueryClient } from "@tanstack/react-query";
import { placeApiService } from "@services/PlaceApiService";

export function usePlaceLike(
  placeId: number,
  onError?: (error: Error) => void
) {
  const queryClient = useQueryClient();

  const likeMutation = useMutation({
    mutationFn: () => placeApiService.likePlace(placeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["places"] });
      queryClient.invalidateQueries({ queryKey: ["placeDetails", placeId] });
      queryClient.refetchQueries({ queryKey: ["places"] });
    },
    onError: (error) => {
      console.error("Error liking place:", error);
      onError?.(error);
    },
  });

  const unlikeMutation = useMutation({
    mutationFn: () => placeApiService.unlikePlace(placeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["places"] });
      queryClient.invalidateQueries({ queryKey: ["placeDetails", placeId] });
      queryClient.refetchQueries({ queryKey: ["places"] });
    },
    onError: (error) => {
      console.error("Error unliking place:", error);
      onError?.(error);
    },
  });

  return {
    like: likeMutation.mutate,
    unlike: unlikeMutation.mutate,
    isLiking: likeMutation.isPending,
    isUnliking: unlikeMutation.isPending,
  };
}
