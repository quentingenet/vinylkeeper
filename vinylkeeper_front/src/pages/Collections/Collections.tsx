import { Box, Typography } from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import { growItem } from "@utils/Animations";
import CollectionItem from "@components/Collections/CollectionItem";
import { useState } from "react";
import useDetectMobile from "@hooks/useDetectMobile";
import {
  getCollections,
  switchAreaCollection,
} from "@services/CollectionService";
import { ICollection, ICollectionSwitchArea } from "@models/ICollectionForm";
import ModalCollection from "@components/Collections/ModalCollection";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function Collections() {
  const [openModal, setOpenModal] = useState(false);
  const [isUpdatingCollection, setIsUpdatingCollection] = useState(false);
  const [collection, setCollection] = useState<ICollection | undefined>(
    undefined
  );
  const [isPublic, setIsPublic] = useState(false);

  const { isMobile } = useDetectMobile();
  const queryClient = useQueryClient();

  const {
    data: collectionsData,
    isLoading: collectionsLoading,
    error,
  } = useQuery({
    queryKey: ["collections"],
    queryFn: getCollections,
  });

  const collections = collectionsData ?? [];

  const switchAreaMutation = useMutation({
    mutationFn: ({ collectionId, newIsPublic }: ICollectionSwitchArea) =>
      switchAreaCollection(collectionId, newIsPublic),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
    onError: (error: Error) => {
      console.error("Error updating collection area status:", error);
    },
  });

  const handleSwitchAreaCollection = (
    collectionId: number,
    newIsPublic: boolean
  ) => {
    switchAreaMutation.mutate({ collectionId, newIsPublic });
  };

  const handleOpenModalCollection = (isUpdating: boolean) => {
    setIsUpdatingCollection(isUpdating);
    setOpenModal(true);
  };

  const handleCollectionClick = (collectionId: number) => {
    const selectedCollection = collections.find(
      (collection: ICollection) => collection.id === collectionId
    );
    setCollection(selectedCollection);
  };

  if (collectionsLoading) return <Typography>Loading...</Typography>;
  if (error) return <Typography>Error loading collections</Typography>;

  return (
    <>
      <ModalCollection
        collection={collection}
        openModal={openModal}
        handleClose={() => setOpenModal(false)}
        isUpdatingCollection={isUpdatingCollection}
        isPublic={isPublic}
        setIsPublic={setIsPublic}
        onCollectionAdded={() => {
          queryClient.invalidateQueries({ queryKey: ["collections"] });
        }}
      />

      <Box
        display={"flex"}
        gap={1}
        flexDirection={"row"}
        justifyContent={"center"}
        alignItems={"center"}
        sx={{ cursor: "pointer" }}
        onClick={() => handleOpenModalCollection(false)}
      >
        <AddCircleOutlineIcon
          fontSize="large"
          sx={{
            color: "#C9A726",
            animation: `${growItem} 1s ease infinite`,
          }}
        />
        <Box>
          <Typography variant="h3">Create a new collection</Typography>
        </Box>
      </Box>

      <Box
        display={isMobile ? "flex" : "grid"}
        flexDirection={isMobile ? "column" : "row"}
        flexWrap={isMobile ? "nowrap" : "wrap"}
        gridTemplateColumns={isMobile ? "repeat(1, 1fr)" : "repeat(3, 1fr)"}
        justifyContent={isMobile ? "center" : "flex-start"}
        alignItems={isMobile ? "center" : "flex-start"}
        gap={4}
        marginY={isMobile ? 1 : 3}
      >
        {collections.length > 0 ? (
          collections.map((collection: ICollection) => (
            <CollectionItem
              key={collection.id}
              collection={collection}
              onSwitchArea={(newIsPublic) =>
                handleSwitchAreaCollection(collection.id, newIsPublic)
              }
              handleOpenModalCollection={() => handleOpenModalCollection(true)}
              onCollectionClick={handleCollectionClick}
              refreshCollections={() => {
                queryClient.invalidateQueries({ queryKey: ["collections"] });
              }}
            />
          ))
        ) : (
          <Typography>No collections found.</Typography>
        )}
      </Box>
    </>
  );
}
