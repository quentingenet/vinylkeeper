import { useMutation, useQueryClient } from "@tanstack/react-query";
import { placeApiService } from "@services/PlaceApiService";
import { useUserContext } from "@contexts/UserContext";

export function usePlaceLike(
  placeId: number,
  onError?: (error: Error) => void
) {
  const queryClient = useQueryClient();
  const { currentUser } = useUserContext();

  const likeMutation = useMutation({
    mutationFn: () => placeApiService.likePlace(placeId),
    onSuccess: async () => {
      // Invalidate specific queries to sync with backend
      queryClient.invalidateQueries({
        queryKey: ["placeDetails", placeId],
      });
      // Invalidate places queries for background sync
      queryClient.invalidateQueries({ queryKey: ["places"] });
    },
    onError: (error) => {
      console.error("Error liking place:", error);
      onError?.(error);
    },
  });

  const unlikeMutation = useMutation({
    mutationFn: () => placeApiService.unlikePlace(placeId),
    onSuccess: async () => {
      // Invalidate specific queries to sync with backend
      queryClient.invalidateQueries({
        queryKey: ["placeDetails", placeId],
      });
      // Invalidate places queries for background sync
      queryClient.invalidateQueries({ queryKey: ["places"] });
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
    // Add error states for better debugging
    likeError: likeMutation.error,
    unlikeError: unlikeMutation.error,
  };
}
