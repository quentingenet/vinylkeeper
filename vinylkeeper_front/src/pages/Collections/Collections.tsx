import { Box, Typography } from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import { growItem } from "@utils/Animations";
import CollectionItem from "@components/Collections/CollectionItem";
import { useEffect, useState } from "react";
import useDetectMobile from "@hooks/useDetectMobile";
import {
  getCollections,
  switchAreaCollection,
} from "@services/CollectionService";
import { ICollection } from "@models/ICollectionForm";
import { useUserContext } from "@contexts/UserContext";
import ModalCollection from "@components/Collections/ModalCollection";

/**
 * Collections Component
 *
 * Main page component for displaying and managing vinyl collections.
 * Allows users to:
 * - View all their collections in a grid layout
 * - Create new collections
 * - Edit existing collections
 * - Toggle collection visibility (public/private)
 * - Delete collections
 * - View collection details
 *
 * @component
 * @example
 * ```tsx
 * <Collections />
 * ```
 *
 * State:
 * - openModal: Controls visibility of collection create/edit modal
 * - collections: Array of user's collections
 * - isLoading: Loading state while fetching collections
 * - refreshTrigger: Counter to trigger collection refresh
 * - isUpdatingCollection: Whether modal is in update or create mode
 * - collection: Currently selected collection for editing
 *
 * @returns React component displaying collections grid and management UI
 */

export default function Collections() {
  const [openModal, setOpenModal] = useState(false);
  const [collections, setCollections] = useState<ICollection[]>([]);
  const { isLoading, setIsLoading } = useUserContext();
  const { isMobile } = useDetectMobile();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isUpdatingCollection, setIsUpdatingCollection] = useState(false);
  const [collection, setCollection] = useState<ICollection | undefined>(
    undefined
  );
  const [isPublic, setIsPublic] = useState(false);
  const handleClose = () => setOpenModal(false);

  const handleOpenModalCollection = (isUpdating: boolean) => {
    setIsUpdatingCollection(isUpdating);
    setOpenModal(true);
  };

  const handleSwitchAreaCollection = async (
    collectionId: number,
    newIsPublic: boolean
  ) => {
    try {
      await switchAreaCollection(collectionId, newIsPublic);
    } catch (error) {
      console.error("Error updating collection area status:", error);
    }
  };

  const handleCollectionClick = (collectionId: number) => {
    const selectedCollection = collections.find(
      (collection) => collection.id === collectionId
    );
    setCollection(selectedCollection);
  };

  useEffect(() => {
    setIsLoading(true);
    getCollections()
      .then((res) => {
        setCollections(res);
      })
      .catch((error) => {
        console.error("Error:", error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [refreshTrigger]);

  return (
    <>
      <ModalCollection
        collection={collection}
        openModal={openModal}
        handleClose={handleClose}
        isUpdatingCollection={isUpdatingCollection}
        onCollectionAdded={() => setRefreshTrigger((prev) => prev + 1)}
        isPublic={isPublic}
        setIsPublic={setIsPublic}
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
        {isLoading ? (
          <Typography>Loading...</Typography>
        ) : collections.length > 0 ? (
          collections.map((collection) => (
            <CollectionItem
              key={collection.id}
              collection={collection}
              onSwitchArea={(newIsPublic) =>
                handleSwitchAreaCollection(collection.id, newIsPublic)
              }
              refreshCollections={() => setRefreshTrigger((prev) => prev + 1)}
              handleOpenModalCollection={() => handleOpenModalCollection(true)}
              onCollectionClick={handleCollectionClick}
            />
          ))
        ) : (
          <></>
        )}
      </Box>
    </>
  );
}
