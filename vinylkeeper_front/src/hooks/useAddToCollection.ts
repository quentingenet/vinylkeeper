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
import {
  duplicatePrompt,
  ownedHint,
  type DuplicatePrompt,
} from "@components/Records/duplicateLabels";

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

  // What the user already owns of this release or its work, to warn before a duplicate
  const isAlbum = itemType === "album" && !!item;
  const albumItem = isAlbum ? (item as IAlbumRequestResults) : null;
  const { data: ownedPressings = [] } = useQuery({
    queryKey: queryKeys.ownedPressings(albumItem?.id ?? ""),
    queryFn: () => externalReferenceApiService.findOwnedPressings(albumItem!.id, albumItem!.master_id),
    enabled: open && albumItem !== null,
    staleTime: 60 * 1000,
  });
  const [pendingDuplicate, setPendingDuplicate] = useState<DuplicatePrompt | null>(null);

  // The API always says whether the item was new: no need to read its message to pick a color
  const handleMutationSuccess = (message: string, isNew: boolean) => {
    const type: MessageType = isNew ? "success" : "warning";
    setMessageType(type);
    setSuccessMessage(message);
    setIsDatePickerOpen(false);

    // Keep the actions open on a duplicate so the user can pick another collection
    if (type === "success") {
      setTimeout(() => {
        setSuccessMessage("");
        handleClose();
      }, 1500);
    } else {
      setTimeout(() => setSuccessMessage(""), 3000);
    }
  };

  const handleMutationError = () => {
    setMessageType("error");
    setSuccessMessage("Could not add the record. Please try again.");
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
      handleMutationSuccess(response.message, response.is_new);
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
      if (isAlbum) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.ownedPressings(variables.item.external_id) });
      }
      handleMutationSuccess(response.message, response.is_new);
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

  const handleAddToCollection = async (collectionId: number, confirmed?: DuplicatePrompt) => {
    if (addToCollectionMutation.isPending) return;

    if (!confirmed) {
      const prompt = isAlbum ? duplicatePrompt(ownedPressings, collectionId) : null;
      if (prompt) {
        setPendingDuplicate(prompt);
        return;
      }
    }
    setPendingDuplicate(null);

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
          // Search results show each pressing: the user picked this exact release
          pressing_confirmed: itemType === "album",
          add_copy: confirmed?.addCopy ?? false,
          album_data: {
            state_record: albumStateData.state_record || undefined,
            state_cover: albumStateData.state_cover || undefined,
            acquisition_month_year:
              albumStateData.acquisition_month_year || undefined,
          },
        },
      });
    } catch {
      // Shown by the mutation's onError
    }
  };

  const handleClose = useCallback(() => {
    setPendingDuplicate(null);
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
    ownedHint: (collectionId: number) => ownedHint(ownedPressings, collectionId),
    pendingDuplicate,
    confirmDuplicate: () => {
      if (pendingDuplicate) void handleAddToCollection(pendingDuplicate.collectionId, pendingDuplicate);
    },
    cancelDuplicate: () => setPendingDuplicate(null),
  };
}
