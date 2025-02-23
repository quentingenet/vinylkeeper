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
import {
  ICollection,
  ICollectionResponse,
  ICollectionSwitchArea,
} from "@models/ICollectionForm";
import ModalCollection from "@components/Collections/ModalCollection";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pagination } from "@mui/material";
import { ITEMS_PER_PAGE } from "@utils/GlobalUtils";

export default function Collections() {
  const [openModal, setOpenModal] = useState(false);
  const [isUpdatingCollection, setIsUpdatingCollection] = useState(false);
  const [collection, setCollection] = useState<ICollection | undefined>(
    undefined
  );
  const [isPublic, setIsPublic] = useState(false);
  const [page, setPage] = useState(1);
  const itemsPerPage = ITEMS_PER_PAGE;

  const { isMobile } = useDetectMobile();
  const queryClient = useQueryClient();

  const {
    data: collectionsData,
    isLoading: collectionsLoading,
    error,
  } = useQuery<ICollectionResponse>({
    queryKey: ["collections", page],
    queryFn: () => getCollections(page, itemsPerPage),
  });

  const collections = collectionsData?.items || [];
  const totalPages = collectionsData?.total_pages || 0;

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
    if (!isUpdating) {
      setCollection(undefined);
    }
    setOpenModal(true);
  };

  const handleCloseModalCollection = () => {
    setOpenModal(false);
    setIsUpdatingCollection(false);
  };

  const handleCollectionClick = (collectionId: number) => {
    const selectedCollection = collections.find(
      (collection) => collection.id === collectionId
    );
    setCollection(selectedCollection);
  };

  if (error) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="200px"
      >
        <Typography color="error">Error loading collections</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <ModalCollection
        collection={collection}
        openModal={openModal}
        handleClose={handleCloseModalCollection}
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
        {collections && collections.length > 0 ? (
          collections.map((collection: ICollection) => (
            <CollectionItem
              key={collection.id}
              collection={collection}
              onSwitchArea={(newIsPublic) =>
                handleSwitchAreaCollection(collection.id, newIsPublic)
              }
              handleOpenModalCollection={() => {
                setCollection(collection);
                handleOpenModalCollection(true);
              }}
              onCollectionClick={handleCollectionClick}
              refreshCollections={() => {
                queryClient.invalidateQueries({ queryKey: ["collections"] });
              }}
            />
          ))
        ) : (
          <Box width="100%" textAlign="center">
            <Typography variant="body1">
              No collection found. Create a new one!
            </Typography>
          </Box>
        )}
      </Box>

      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={4} mb={2}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, newPage) => setPage(newPage)}
            color="primary"
            size={isMobile ? "medium" : "large"}
            shape="circular"
          />
        </Box>
      )}
    </Box>
  );
}
