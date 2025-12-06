import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  collectionApiService,
  type CollectionResponse,
  type PaginatedCollectionResponse,
  type CollectionCreate,
} from "@services/CollectionApiService";
import { ITEMS_PER_PAGE, VinylStateEnum } from "@utils/GlobalUtils";
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
  createCollection: (data: CollectionCreate) => void;
  deleteCollection: (collectionId: number) => void;
  isCreatingCollection: boolean;
  isDeletingCollection: boolean;
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
      // Only invalidate if we don't have data for the current page
      const currentData = queryClient.getQueryData([
        "collections",
        currentUser?.user_uuid,
        page,
      ]);
      if (!currentData) {
        void queryClient.invalidateQueries({ queryKey: ["collections"] });
      }
    }
  }, [currentUser?.user_uuid, queryClient, page]);

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
    retry: 1, // Reduce retries to avoid too many requests
    retryDelay: 1000, // Fixed delay
    enabled: !!currentUser?.user_uuid, // Only run query if user is logged in
    refetchOnWindowFocus: false, // Prevent refetch on window focus
    refetchOnMount: false, // Prevent refetch on component mount if data exists
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
    onSuccess: async (_, variables) => {
      // Invalidate all collection queries to ensure UI consistency
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["collections", currentUser?.user_uuid],
        }),
        queryClient.invalidateQueries({
          queryKey: ["publicCollections"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["collectionDetails", variables.collectionId],
        }),
      ]);
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

  // Optimistic create collection mutation
  const createCollectionMutation = useMutation<
    { message: string; collection_id: number },
    HTTPError,
    CollectionCreate
  >({
    mutationFn: collectionApiService.createCollection,
    onMutate: async (newCollection) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ["collections", currentUser?.user_uuid],
      });

      // Snapshot the previous value
      const previousCollections =
        queryClient.getQueryData<PaginatedCollectionResponse>([
          "collections",
          currentUser?.user_uuid,
          page,
        ]);

      // Optimistically update to the new value
      if (previousCollections) {
        const optimisticCollection: CollectionResponse = {
          id: -Math.floor(Math.random() * 1000000), // Temporary negative ID (safe for int32)
          name: newCollection.name,
          description: newCollection.description,
          is_public: newCollection.is_public,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          owner_id: 0, // Will be set by server
          albums: [],
          artists: [],
          likes_count: 0,
          is_liked_by_user: false,
          owner: {
            id: 0, // Will be set by server
            username: currentUser!.username,
            user_uuid: currentUser!.user_uuid,
          },
          wishlist: [],
        };

        queryClient.setQueryData<PaginatedCollectionResponse>(
          ["collections", currentUser?.user_uuid, page],
          {
            ...previousCollections,
            items: [optimisticCollection, ...previousCollections.items],
            total: previousCollections.total + 1,
          }
        );
      }

      return { previousCollections };
    },
    onError: (_err, _newCollection, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (
        context &&
        typeof context === "object" &&
        "previousCollections" in context &&
        context.previousCollections
      ) {
        queryClient.setQueryData(
          ["collections", currentUser?.user_uuid, page],
          context.previousCollections
        );
      }
    },
    onSuccess: async (data, _newCollection, context) => {
      // Replace the temporary ID with the real ID from the server
      if (
        context &&
        typeof context === "object" &&
        "previousCollections" in context &&
        context.previousCollections
      ) {
        const currentData =
          queryClient.getQueryData<PaginatedCollectionResponse>([
            "collections",
            currentUser?.user_uuid,
            page,
          ]);

        if (currentData) {
          // Find the collection with negative ID and replace it with the real ID
          const updatedItems = currentData.items.map((item) =>
            item.id < 0 ? { ...item, id: data.collection_id } : item
          );

          queryClient.setQueryData<PaginatedCollectionResponse>(
            ["collections", currentUser?.user_uuid, page],
            {
              ...currentData,
              items: updatedItems,
            }
          );
        }
      }

      // Invalidate collections and public collections
      // (invalidate public collections in case the new collection is public)
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["collections", currentUser?.user_uuid, page],
        }),
        queryClient.invalidateQueries({
          queryKey: ["publicCollections"],
        }),
      ]);
    },
  });

  // Optimistic delete collection mutation
  const deleteCollectionMutation = useMutation<
    { message: string },
    HTTPError,
    number
  >({
    mutationFn: (collectionId: number) =>
      collectionApiService.deleteCollection(collectionId),
    onMutate: async (collectionId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ["collections", currentUser?.user_uuid],
      });

      // Snapshot the previous value
      const previousCollections =
        queryClient.getQueryData<PaginatedCollectionResponse>([
          "collections",
          currentUser?.user_uuid,
          page,
        ]);

      // Optimistically update to the new value
      if (previousCollections) {
        queryClient.setQueryData<PaginatedCollectionResponse>(
          ["collections", currentUser?.user_uuid, page],
          {
            ...previousCollections,
            items: previousCollections.items.filter(
              (item) => item.id !== collectionId
            ),
            total: Math.max(0, previousCollections.total - 1),
          }
        );
      }

      return { previousCollections };
    },
    onError: (_err, _collectionId, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (
        context &&
        typeof context === "object" &&
        "previousCollections" in context &&
        context.previousCollections
      ) {
        queryClient.setQueryData(
          ["collections", currentUser?.user_uuid, page],
          context.previousCollections
        );
      }
    },
    onSuccess: async () => {
      // Invalidate collections and public collections (deleted collection might have been public)
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["collections", currentUser?.user_uuid, page],
        }),
        queryClient.invalidateQueries({
          queryKey: ["publicCollections"],
        }),
      ]);
    },
  });

  return {
    collections: collectionsData?.items || [],
    totalPages: collectionsData?.total_pages || 0,
    collectionsLoading,
    error: error || null,
    isError,
    handleSwitchVisibility,
    refreshCollections: () => {
      void queryClient.invalidateQueries({
        queryKey: ["collections", currentUser?.user_uuid, page],
      });
    },
    createCollection: createCollectionMutation.mutate,
    deleteCollection: deleteCollectionMutation.mutate,
    isCreatingCollection: createCollectionMutation.isPending,
    isDeletingCollection: deleteCollectionMutation.isPending,
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
        state_record?: VinylStateEnum | null;
        state_cover?: VinylStateEnum | null;
        acquisition_month_year?: string | null;
      };
    }) => {
      return collectionApiService.updateAlbumMetadata(
        collectionId,
        albumId,
        data
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["collectionDetails"] }),
        queryClient.invalidateQueries({ queryKey: ["collectionAlbums"] }),
      ]);
    },
    onError: (error) => {
      console.error("Error updating album states:", error);
    },
  });
}
