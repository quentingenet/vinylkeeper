import { Box, Typography } from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import { growItem } from "@utils/Animations";
import CollectionItem from "@components/Collections/CollectionItem";
import CollectionGrid from "@components/Collections/CollectionGrid";
import CollectionsPagination from "@components/Collections/CollectionsPagination";
import LoadingCenter from "@components/UI/LoadingCenter";
import { useState, useCallback } from "react";
import {
  CollectionResponse,
  CollectionListItemResponse,
} from "@services/CollectionApiService";
import ModalCollection from "@components/Collections/ModalCollection";
import { ITEMS_PER_PAGE } from "@utils/GlobalUtils";
import { useCollections } from "@hooks/useCollections";
import { useNavigate } from "react-router-dom";
import { EGlobalUrls } from "@utils/GlobalUrls";
import { useDebounce } from "@hooks/useDebounce";

export default function MyCollectionsPanel() {
  const [modalState, setModalState] = useState({
    isOpen: false,
    isUpdating: false,
    collection: undefined as CollectionResponse | undefined,
    isPublic: false,
  });
  const [page, setPage] = useState(1);
  const [debouncedPage, setDebouncedPage] = useState(1);
  const itemsPerPage = ITEMS_PER_PAGE;
  const navigate = useNavigate();

  // Debounce page changes to avoid too many requests
  useDebounce(
    () => {
      setDebouncedPage(page);
    },
    300,
    [page]
  );

  const {
    collections,
    totalPages,
    collectionsLoading,
    error,
    isError,
    handleSwitchVisibility,
    refreshCollections,
  } = useCollections(debouncedPage, itemsPerPage);

  const handleOpenModalCollection = (
    isUpdating: boolean,
    collection?: CollectionResponse
  ) => {
    setModalState({
      isOpen: true,
      isUpdating,
      collection: collection as CollectionResponse | undefined,
      isPublic: false,
    });
  };

  const handleCloseModalCollection = () => {
    setModalState((prev) => ({ ...prev, isOpen: false, isUpdating: false }));
  };

  const handleCollectionClick = (
    collection: CollectionResponse | CollectionListItemResponse
  ) => {
    void navigate(
      EGlobalUrls.COLLECTION_DETAILS.replace(":id", collection.id.toString())
    );
  };

  // Memoize pagination change handler to prevent unnecessary re-renders
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

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
    return <LoadingCenter />;
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
            color: "primary.main",
            animation: `${growItem} 1s ease infinite`,
          }}
        />
        <Box>
          <Typography variant="h3">Create a new collection</Typography>
          <Typography variant="body1" color="text.secondary" mt={1}>
            Share your collection with others by changing
            <br /> its visibility from private to public.
          </Typography>
        </Box>
      </Box>

      {collections && collections.length > 0 ? (
        <CollectionGrid
          sx={{
            cursor: "pointer",
            transition: "transform 0.2s ease-in-out",
            "&:hover": {
              transform: "scale(1.005)",
            },
          }}
        >
          {collections.map((collection: CollectionListItemResponse) => (
            <CollectionItem
              key={collection.id}
              collection={collection}
              onSwitchArea={(newIsPublic) => {
                handleSwitchVisibility(collection.id, newIsPublic);
              }}
              handleOpenModalCollection={(collection) => {
                handleOpenModalCollection(true, collection as CollectionResponse);
              }}
              onCollectionClick={handleCollectionClick}
              isOwner={true}
              showOwner={false}
            />
          ))}
        </CollectionGrid>
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

      <CollectionsPagination
        totalPages={totalPages}
        page={page}
        onChange={handlePageChange}
      />
    </Box>
  );
}
