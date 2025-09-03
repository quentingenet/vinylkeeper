import { useMutation, useQueryClient } from "@tanstack/react-query";
import { collectionApiService } from "@services/CollectionApiService";
import { useUserContext } from "@contexts/UserContext";

export function useCollectionLike(collectionId: number) {
  const queryClient = useQueryClient();
  const { currentUser } = useUserContext();

  const likeMutation = useMutation({
    mutationFn: () => collectionApiService.likeCollection(collectionId),
    onSuccess: async () => {
      // Invalidate specific queries to sync with backend
      queryClient.invalidateQueries({
        queryKey: ["collectionDetails", collectionId],
      });
      // Invalidate collections queries for background sync
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["publicCollections"] });
    },
    onError: (error) => {
      console.error("Error liking collection:", error);
      // Let the component handle error state
    },
  });

  const unlikeMutation = useMutation({
    mutationFn: () => collectionApiService.unlikeCollection(collectionId),
    onSuccess: async () => {
      // Invalidate specific queries to sync with backend
      queryClient.invalidateQueries({
        queryKey: ["collectionDetails", collectionId],
      });
      // Invalidate collections queries for background sync
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["publicCollections"] });
    },
    onError: (error) => {
      console.error("Error unliking collection:", error);
      // Let the component handle error state
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
