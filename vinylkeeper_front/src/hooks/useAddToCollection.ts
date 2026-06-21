import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collectionApiService } from "@services/CollectionApiService";
import { externalReferenceApiService } from "@services/ExternalReferenceService";
import {
  IAlbumRequestResults,
  IArtistRequestResults,
} from "@models/IRequestProxy";
import {
  AddToWishlistRequest,
  AddToCollectionRequest,
} from "@models/IExternalReference";
import { VinylStateEnum } from "@utils/GlobalUtils";
import { queryKeys } from "@utils/queryKeys";
import { useUserContext } from "@contexts/UserContext";

export interface AlbumStateData {
  state_cover?: VinylStateEnum | null;
  state_record?: VinylStateEnum | null;
  acquisition_month_year?: string | null;
}

type MessageType = "success" | "warning" | "info" | "error";

type AlbumStateInternal = {
  state_record: VinylStateEnum | null;
  state_cover: VinylStateEnum | null;
  acquisition_month_year: string | null;
};

export function useAddToCollection(
  item: IAlbumRequestResults | IArtistRequestResults | null,
  itemType: "album" | "artist",
  open: boolean,
  onClose: () => void
) {
  const [showCollectionSelection, setShowCollectionSelection] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [messageType, setMessageType] = useState<MessageType>("success");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [albumStateData, setAlbumStateData] = useState<AlbumStateInternal>({
    state_record: null,
    state_cover: null,
    acquisition_month_year: null,
  });

  const queryClient = useQueryClient();
  const { currentUser } = useUserContext();

  const { data: collectionsData, isLoading: collectionsLoading } = useQuery({
    queryKey: queryKeys.collections.forUser(currentUser?.user_uuid),
    queryFn: () => collectionApiService.getCollections(1, 100),
    enabled: open && !!currentUser?.user_uuid,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const collections = collectionsData?.items ?? [];

  const handleMutationSuccess = (
    queryKey: string,
    customMessage?: string,
    isNew?: boolean
  ) => {
    if (!customMessage && isNew === undefined) return;

    const message = customMessage || `Successfully added to ${queryKey}`;
    let type: MessageType = "success";

    if (customMessage?.includes("Error")) {
      type = "error";
    } else if (isNew === false) {
      type = "warning";
    } else if (isNew === true) {
      type = "success";
    } else if (customMessage?.includes("Already have")) {
      type = "warning";
    } else if (customMessage?.includes("Added")) {
      type = "success";
    }

    setMessageType(type);
    setSuccessMessage(message);
    setIsDatePickerOpen(false);

    // Keep modal open on duplicate/error so the user can retry with another collection
    if (type === "success") {
      setTimeout(() => {
        setSuccessMessage("");
        handleClose();
      }, 1500);
    } else {
      setTimeout(() => setSuccessMessage(""), 3000);
    }
  };

  const handleMutationError = (error: Error) => {
    setMessageType("error");
    const errorMessage = error.message.includes("Error adding to")
      ? error.message
      : "An error occurred while adding to collection";
    setSuccessMessage(errorMessage);
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  const handleAlbumStateChange = (
    field: keyof AlbumStateData,
    value: AlbumStateData[keyof AlbumStateData]
  ) => {
    setAlbumStateData((prev) => ({ ...prev, [field]: value }));
  };

  const addToWishlistMutation = useMutation({
    mutationFn: (albumData: AddToWishlistRequest) =>
      externalReferenceApiService.addToWishlist(albumData),
    onSuccess: async (response) => {
      // Fallback to all() if uuid not yet available so invalidation always reaches cached pages
      await queryClient.invalidateQueries({
        queryKey: currentUser?.user_uuid
          ? queryKeys.wishlist.forUser(currentUser.user_uuid)
          : queryKeys.wishlist.all(),
      });
      handleMutationSuccess("wishlist", response.message, response.is_new);
    },
    onError: handleMutationError,
  });

  const addToCollectionMutation = useMutation({
    mutationFn: (data: { collectionId: number; item: AddToCollectionRequest }) =>
      externalReferenceApiService.addToCollection(data.collectionId, data.item),
    onSuccess: async (response, variables) => {
      const isAlbum = variables.item.entity_type === "album";
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.collections.forUser(currentUser?.user_uuid) }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.collections.detail(variables.collectionId),
        }),
        queryClient.invalidateQueries({
          queryKey: isAlbum
            ? queryKeys.collections.albums(variables.collectionId)
            : queryKeys.collections.artists(variables.collectionId),
        }),
      ]);
      handleMutationSuccess("collections", response.message, response.is_new);
    },
    onError: handleMutationError,
  });

  const handleAddToWishlist = () => {
    if (!item) return;
    addToWishlistMutation.mutate({
      external_id: item.id.toString(),
      entity_type: itemType.toLowerCase() as "album" | "artist",
      title:
        itemType === "album"
          ? (item as IAlbumRequestResults).title || item.id.toString()
          : (item as IArtistRequestResults).title || item.id.toString(),
      image_url: item.picture || "",
      source: "discogs",
    });
  };

  const handleAddToCollection = async (collectionId: number) => {
    if (addToCollectionMutation.isPending) return;

    setSuccessMessage("Adding to collection...");
    try {
      await addToCollectionMutation.mutateAsync({
        collectionId,
        item: {
          external_id: item?.id.toString() || "",
          entity_type: itemType.toLowerCase() as "album" | "artist",
          title: item?.title || "",
          image_url: item?.picture || "",
          source: "discogs",
          album_data: {
            state_record: albumStateData.state_record || undefined,
            state_cover: albumStateData.state_cover || undefined,
            acquisition_month_year:
              albumStateData.acquisition_month_year || undefined,
          },
        },
      });
    } catch (err) {
      handleMutationError(
        err instanceof Error ? err : new Error("An error occurred")
      );
    }
  };

  const handleClose = useCallback(() => {
    setShowCollectionSelection(false);
    setSuccessMessage("");
    setIsDatePickerOpen(false);
    setAlbumStateData({
      state_cover: null,
      state_record: null,
      acquisition_month_year: null,
    });
    onClose();
  }, [onClose]);

  return {
    showCollectionSelection,
    setShowCollectionSelection,
    successMessage,
    messageType,
    albumStateData,
    isDatePickerOpen,
    setIsDatePickerOpen,
    collections,
    collectionsLoading,
    isAddingToWishlist: addToWishlistMutation.isPending,
    isAddingToCollection: addToCollectionMutation.isPending,
    handleAlbumStateChange,
    handleAddToWishlist,
    handleAddToCollection,
    handleClose,
  };
}
