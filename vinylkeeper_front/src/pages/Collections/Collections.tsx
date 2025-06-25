import { Box, Typography } from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import { growItem } from "@utils/Animations";
import CollectionItem from "@components/Collections/CollectionItem";
import PaginationWithEllipsis from "@components/UI/PaginationWithEllipsis";
import VinylSpinner from "@components/UI/VinylSpinner";
import { useState } from "react";
import useDetectMobile from "@hooks/useDetectMobile";
import { CollectionResponse } from "@services/CollectionApiService";
import ModalCollection from "@components/Collections/ModalCollection";
import { ITEMS_PER_PAGE } from "@utils/GlobalUtils";
import { useCollections } from "@hooks/useCollections";
import { useNavigate } from "react-router-dom";
import { EGlobalUrls } from "@utils/GlobalUrls";

export default function Collections() {
  const [modalState, setModalState] = useState({
    isOpen: false,
    isUpdating: false,
    collection: undefined as CollectionResponse | undefined,
    isPublic: false,
  });
  const [page, setPage] = useState(1);
  const itemsPerPage = ITEMS_PER_PAGE;
  const navigate = useNavigate();

  const { isMobile } = useDetectMobile();
  const {
    collections,
    totalPages,
    collectionsLoading,
    error,
    isError,
    handleSwitchVisibility,
    refreshCollections,
  } = useCollections(page, itemsPerPage);

  const handleOpenModalCollection = (
    isUpdating: boolean,
    collection?: CollectionResponse
  ) => {
    setModalState({
      isOpen: true,
      isUpdating,
      collection,
      isPublic: false,
    });
  };

  const handleCloseModalCollection = () => {
    setModalState((prev) => ({ ...prev, isOpen: false, isUpdating: false }));
  };

  const handleCollectionClick = (collection: CollectionResponse) => {
    navigate(
      EGlobalUrls.COLLECTION_DETAILS.replace(":id", collection.id.toString())
    );
  };

  if (isError) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="200px"
      >
        <Typography color="error">
          {error instanceof Error ? error.message : "Error loading collections"}
        </Typography>
      </Box>
    );
  }

  if (collectionsLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="200px"
      >
        <VinylSpinner />
      </Box>
    );
  }

  return (
    <Box>
      <ModalCollection
        collection={modalState.collection}
        openModal={modalState.isOpen}
        handleClose={handleCloseModalCollection}
        isUpdatingCollection={modalState.isUpdating}
        isPublic={modalState.isPublic}
        setIsPublic={(isPublic) =>
          setModalState((prev) => ({ ...prev, isPublic }))
        }
        onCollectionAdded={refreshCollections}
      />

      <Box
        display="flex"
        gap={1}
        flexDirection="row"
        justifyContent="center"
        alignItems="center"
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

      {collections && collections.length > 0 ? (
        <Box
          display={isMobile ? "flex" : "grid"}
          flexDirection={isMobile ? "column" : "row"}
          flexWrap={isMobile ? "nowrap" : "wrap"}
          gridTemplateColumns={isMobile ? "repeat(1, 1fr)" : "repeat(3, 1fr)"}
          justifyContent={isMobile ? "center" : "flex-start"}
          alignItems={isMobile ? "center" : "flex-start"}
          gap={4}
          marginY={isMobile ? 1 : 3}
          sx={{
            cursor: "pointer",
            transition: "transform 0.2s ease-in-out",
            "&:hover": {
              transform: "scale(1.005)",
            },
          }}
        >
          {collections.map((collection: CollectionResponse) => (
            <CollectionItem
              key={collection.id}
              collection={collection}
              onSwitchArea={(newIsPublic) => {
                handleSwitchVisibility(collection.id, newIsPublic);
              }}
              handleOpenModalCollection={(collection) => {
                handleOpenModalCollection(true, collection);
              }}
              onCollectionClick={handleCollectionClick}
              isOwner={true}
              showOwner={false}
            />
          ))}
        </Box>
      ) : (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          marginY={4}
        >
          <Typography variant="body1" color="text.secondary">
            No collection found. Create a new one!
          </Typography>
        </Box>
      )}

      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={4} mb={2}>
          <PaginationWithEllipsis
            count={totalPages}
            page={page}
            onChange={(newPage) => setPage(newPage)}
            color="primary"
            size={isMobile ? "medium" : "large"}
          />
        </Box>
      )}
    </Box>
  );
}
