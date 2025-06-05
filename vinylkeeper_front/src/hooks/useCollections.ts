import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  collectionApiService,
  type CollectionResponse,
  type PaginatedCollectionResponse,
} from "@services/CollectionApiService";
import { ITEMS_PER_PAGE } from "@utils/GlobalUtils";
import { HTTPError } from "ky";
import { useUserContext } from "@contexts/UserContext";
import { useEffect } from "react";

interface ICollectionVisibilityUpdate {
  collectionId: number;
  newIsPublic: boolean;
}

interface UseCollectionsReturn {
  collections: CollectionResponse[];
  totalPages: number;
  collectionsLoading: boolean;
  error: HTTPError | null;
  isError: boolean;
  handleSwitchVisibility: (collectionId: number, newIsPublic: boolean) => void;
  refreshCollections: () => void;
}

export const useCollections = (
  page: number = 1,
  itemsPerPage: number = ITEMS_PER_PAGE
): UseCollectionsReturn => {
  const queryClient = useQueryClient();
  const { currentUser } = useUserContext();

  // Invalidate all collection queries when user changes
  useEffect(() => {
    if (currentUser?.user_uuid) {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    }
  }, [currentUser?.user_uuid, queryClient]);

  const {
    data: collectionsData,
    isLoading: collectionsLoading,
    error,
    isError,
  } = useQuery<PaginatedCollectionResponse, HTTPError>({
    queryKey: ["collections", currentUser?.user_uuid, page],
    queryFn: () => collectionApiService.getCollections(page, itemsPerPage),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled: !!currentUser?.user_uuid, // Only run query if user is logged in
  });

  const switchVisibilityMutation = useMutation<
    { message: string },
    HTTPError,
    ICollectionVisibilityUpdate
  >({
    mutationFn: ({ collectionId, newIsPublic }) =>
      collectionApiService.switchCollectionVisibility(
        collectionId,
        newIsPublic
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["collections", currentUser?.user_uuid],
      });
    },
    onError: (error) => {
      console.error("Error updating collection visibility:", error.message);
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
    error: error || null,
    isError,
    handleSwitchVisibility,
    refreshCollections: () =>
      queryClient.invalidateQueries({
        queryKey: ["collections", currentUser?.user_uuid],
      }),
  };
};

export function useUpdateAlbumStates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      collectionId,
      albumId,
      data,
    }: {
      collectionId: number;
      albumId: number;
      data: {
        state_record?: string | null;
        state_cover?: string | null;
        acquisition_month_year?: string | null;
      };
    }) => {
      return collectionApiService.updateAlbumMetadata(
        collectionId,
        albumId,
        data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collectionDetails"] });
      queryClient.invalidateQueries({ queryKey: ["collectionAlbums"] });
    },
    onError: (error) => {
      console.error("Error updating album states:", error);
    },
  });
}
