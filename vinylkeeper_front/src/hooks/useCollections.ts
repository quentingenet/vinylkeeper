import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collectionApiService } from "@services/CollectionApiService";
import { ICollection, ICollectionResponse } from "@models/ICollectionForm";
import { ITEMS_PER_PAGE } from "@utils/GlobalUtils";

interface ICollectionVisibilityUpdate {
  collectionId: number;
  newIsPublic: boolean;
}

export const useCollections = (
  page: number = 1,
  itemsPerPage: number = ITEMS_PER_PAGE
) => {
  const queryClient = useQueryClient();

  const {
    data: collectionsData,
    isLoading: collectionsLoading,
    error,
    isError,
  } = useQuery<ICollectionResponse>({
    queryKey: ["collections", page],
    queryFn: () => collectionApiService.getCollections(page, itemsPerPage),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const switchVisibilityMutation = useMutation({
    mutationFn: ({ collectionId, newIsPublic }: ICollectionVisibilityUpdate) =>
      collectionApiService.switchCollectionVisibility(
        collectionId,
        newIsPublic
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
    onError: (error: Error) => {
      console.error("Error updating collection visibility:", error);
    },
  });

  const handleSwitchVisibility = (
    collectionId: number,
    newIsPublic: boolean
  ) => {
    switchVisibilityMutation.mutate({ collectionId, newIsPublic });
  };

  return {
    collections: collectionsData?.items || [],
    totalPages: collectionsData?.total_pages || 0,
    collectionsLoading,
    error,
    isError,
    handleSwitchVisibility,
    refreshCollections: () =>
      queryClient.invalidateQueries({ queryKey: ["collections"] }),
  };
};
