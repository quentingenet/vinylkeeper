import React, { useState } from "react";
import {
  Modal,
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  Fade,
  Backdrop,
  IconButton,
  Alert,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import FavoriteIcon from "@mui/icons-material/Favorite";
import {
  IAlbumRequestResults,
  IArtistRequestResults,
} from "@models/IRequestProxy";
import { ICollection } from "@models/ICollectionForm";
import { collectionApiService } from "@services/CollectionApiService";
import {
  addToWishlist,
  addToCollection,
} from "@services/ExternalReferenceService";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useDetectMobile from "@hooks/useDetectMobile";

interface AddToCollectionModalProps {
  open: boolean;
  onClose: () => void;
  item: IAlbumRequestResults | IArtistRequestResults | null;
  itemType: "album" | "artist";
}

interface CollectionSelectionModalProps {
  open: boolean;
  onClose: () => void;
  onBack: () => void;
  item: IAlbumRequestResults | IArtistRequestResults;
  itemType: "album" | "artist";
  collections: ICollection[];
  onAddToCollection: (collectionId: number) => void;
  successMessage?: string;
}

const CollectionSelectionModal: React.FC<CollectionSelectionModalProps> = ({
  open,
  onClose,
  onBack,
  item,
  itemType,
  collections,
  onAddToCollection,
  successMessage,
}) => {
  const { isMobile } = useDetectMobile();

  const style = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: isMobile ? "85%" : 400,
    bgcolor: "#3f3f41",
    borderRadius: 2,
    boxShadow: 24,
    p: 3,
    maxHeight: "80vh",
    overflow: "auto",
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeAfterTransition
      slots={{ backdrop: Backdrop }}
    >
      <Fade in={open}>
        <Box sx={style}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
          >
            <Typography variant="h6" component="h2" sx={{ color: "#C9A726" }}>
              Select Collection
            </Typography>
            <IconButton onClick={onClose} size="small">
              <CloseIcon sx={{ color: "#fffbf9" }} />
            </IconButton>
          </Box>

          {successMessage && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {successMessage}
            </Alert>
          )}

          <Typography variant="body2" sx={{ color: "#fffbf9" }} mb={2}>
            Add "
            {itemType === "album"
              ? (item as IAlbumRequestResults).title
              : (item as IArtistRequestResults).name}
            " to a collection:
          </Typography>

          {collections.length === 0 ? (
            <Typography
              variant="body2"
              sx={{ color: "#fffbf9" }}
              textAlign="center"
              py={4}
            >
              No collections found. Create a collection first.
            </Typography>
          ) : (
            <List dense>
              {collections.map((collection) => (
                <React.Fragment key={collection.id}>
                  <ListItem disablePadding>
                    <ListItemButton
                      onClick={() => onAddToCollection(collection.id)}
                      sx={{ borderRadius: 1 }}
                    >
                      <ListItemText
                        primary={collection.name}
                        secondary={collection.description || "No description"}
                        sx={{
                          "& .MuiListItemText-primary": { color: "#fffbf9" },
                          "& .MuiListItemText-secondary": { color: "#e4e4e4" },
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                  <Divider sx={{ bgcolor: "#666" }} />
                </React.Fragment>
              ))}
            </List>
          )}

          <Box display="flex" justifyContent="space-between" mt={3}>
            <Button variant="text" onClick={onBack} sx={{ color: "#fffbf9" }}>
              Back
            </Button>
            <Button variant="text" onClick={onClose} sx={{ color: "#fffbf9" }}>
              Cancel
            </Button>
          </Box>
        </Box>
      </Fade>
    </Modal>
  );
};

const AddToCollectionModal: React.FC<AddToCollectionModalProps> = ({
  open,
  onClose,
  item,
  itemType,
}) => {
  const [showCollectionSelection, setShowCollectionSelection] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [confirmationType, setConfirmationType] = useState<
    "wishlist" | "collection" | null
  >(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<
    number | null
  >(null);
  const { isMobile } = useDetectMobile();
  const queryClient = useQueryClient();

  const { data: collectionsData, isLoading: collectionsLoading } = useQuery({
    queryKey: ["collections"],
    queryFn: () => collectionApiService.getCollections(1, 100),
    enabled: open,
  });

  const collections = collectionsData?.items || [];

  const addToWishlistMutation = useMutation({
    mutationFn: async (albumData: {
      external_id: string;
      title: string;
      artist_name?: string;
      picture_medium?: string;
    }) => {
      return addToWishlist(albumData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlistItems"] });
      setSuccessMessage("Added successfully!");
      setTimeout(() => {
        setSuccessMessage("");
        onClose();
      }, 2000);
    },
    onError: (error) => {
      console.error("Error adding to wishlist:", error);
      setSuccessMessage("Error adding to wishlist");
    },
  });

  const addToCollectionMutation = useMutation({
    mutationFn: async ({
      collectionId,
      itemData,
    }: {
      collectionId: number;
      itemData: {
        external_id: string;
        item_type: "album" | "artist";
        title: string;
        artist_name?: string;
        picture_medium?: string;
      };
    }) => {
      return addToCollection(collectionId, itemData);
    },
    onSuccess: () => {
      setSuccessMessage("Added successfully!");
      setTimeout(() => {
        setSuccessMessage("");
        setShowCollectionSelection(false);
        onClose();
      }, 2000);
    },
    onError: (error) => {
      console.error("Error adding to collection:", error);
      setSuccessMessage("Error adding to collection");
    },
  });

  const handleAddToWishlist = () => {
    setConfirmationType("wishlist");
    setConfirmationOpen(true);
  };

  const handleAddToCollection = (collectionId: number) => {
    setSelectedCollectionId(collectionId);
    setConfirmationType("collection");
    setConfirmationOpen(true);
  };

  const confirmAction = () => {
    if (confirmationType === "wishlist" && item && itemType === "album") {
      const albumItem = item as IAlbumRequestResults;
      addToWishlistMutation.mutate({
        external_id: item.uuid,
        title: albumItem.title || "",
        artist_name:
          typeof albumItem.artist === "object"
            ? albumItem.artist?.name || undefined
            : albumItem.artist || undefined,
        picture_medium: item.picture_medium || undefined,
      });
    } else if (
      confirmationType === "collection" &&
      item &&
      selectedCollectionId
    ) {
      const getTitle = () => {
        if (itemType === "album") {
          return (item as IAlbumRequestResults).title || "";
        } else {
          return (item as IArtistRequestResults).name || "";
        }
      };

      const getArtistName = () => {
        if (itemType === "album") {
          const albumItem = item as IAlbumRequestResults;
          return typeof albumItem.artist === "object"
            ? albumItem.artist?.name || undefined
            : albumItem.artist || undefined;
        }
        return undefined;
      };

      addToCollectionMutation.mutate({
        collectionId: selectedCollectionId,
        itemData: {
          external_id: item.uuid,
          item_type: itemType,
          title: getTitle(),
          artist_name: getArtistName(),
          picture_medium: item.picture_medium,
        },
      });
    }
    setConfirmationOpen(false);
    setConfirmationType(null);
    setSelectedCollectionId(null);
  };

  const cancelConfirmation = () => {
    setConfirmationOpen(false);
    setConfirmationType(null);
    setSelectedCollectionId(null);
  };

  const handleClose = () => {
    setShowCollectionSelection(false);
    setSuccessMessage("");
    onClose();
  };

  const style = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: isMobile ? "85%" : 400,
    bgcolor: "#3f3f41",
    borderRadius: 2,
    boxShadow: 24,
    p: 3,
  };

  if (!item) return null;

  return (
    <>
      <Modal
        open={open && !showCollectionSelection}
        onClose={handleClose}
        closeAfterTransition
        slots={{ backdrop: Backdrop }}
      >
        <Fade in={open && !showCollectionSelection}>
          <Box sx={style}>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={2}
            >
              <Typography variant="h6" component="h2" sx={{ color: "#C9A726" }}>
                Add to collection or wishlist
              </Typography>
              <IconButton onClick={handleClose} size="small">
                <CloseIcon sx={{ color: "#fffbf9" }} />
              </IconButton>
            </Box>

            {successMessage && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {successMessage}
              </Alert>
            )}

            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              mb={3}
            >
              <img
                src={item.picture_medium}
                alt={
                  itemType === "album"
                    ? (item as IAlbumRequestResults).title
                    : (item as IArtistRequestResults).name
                }
                style={{
                  width: 150,
                  height: 150,
                  objectFit: "contain",
                  borderRadius: 4,
                  marginRight: 16,
                }}
              />
              <Box>
                {itemType === "album" &&
                  (item as IAlbumRequestResults).artist?.name && (
                    <Typography
                      variant="subtitle1"
                      fontWeight="bold"
                      sx={{ color: "#C9A726", marginBottom: "4px" }}
                    >
                      {(item as IAlbumRequestResults).artist?.name}
                    </Typography>
                  )}
                <Typography variant="body2" sx={{ color: "#fffbf9" }}>
                  {itemType === "album"
                    ? (item as IAlbumRequestResults).title
                    : (item as IArtistRequestResults).name}
                </Typography>
                <Typography variant="body2" sx={{ color: "#e4e4e4" }}>
                  {itemType === "album" ? "Album" : "Artist"}
                </Typography>
              </Box>
            </Box>

            <Box display="flex" flexDirection="column" gap={2}>
              {itemType === "album" && (
                <Button
                  variant="text"
                  startIcon={<FavoriteIcon />}
                  onClick={handleAddToWishlist}
                  disabled={addToWishlistMutation.isPending}
                  fullWidth
                  sx={{
                    justifyContent: "flex-start",
                    color: "#C9A726",
                    "&:hover": {
                      backgroundColor: "rgba(201, 167, 38, 0.1)",
                    },
                  }}
                >
                  {addToWishlistMutation.isPending ? (
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                  ) : null}
                  Add to Wishlist
                </Button>
              )}

              <Button
                variant="contained"
                onClick={() => setShowCollectionSelection(true)}
                disabled={
                  collectionsLoading || addToCollectionMutation.isPending
                }
                fullWidth
                sx={{
                  justifyContent: "flex-start",
                  backgroundColor: "#C9A726",
                  "&:hover": {
                    backgroundColor: "#b8961f",
                  },
                }}
              >
                {collectionsLoading || addToCollectionMutation.isPending ? (
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                ) : null}
                Add to My Collections
              </Button>
            </Box>

            <Box display="flex" justifyContent="center" mt={3}>
              <Button
                variant="text"
                onClick={handleClose}
                sx={{ color: "#fffbf9" }}
              >
                Cancel
              </Button>
            </Box>
          </Box>
        </Fade>
      </Modal>

      {item && (
        <CollectionSelectionModal
          open={showCollectionSelection}
          onClose={handleClose}
          onBack={() => setShowCollectionSelection(false)}
          item={item}
          itemType={itemType}
          collections={collections}
          onAddToCollection={handleAddToCollection}
          successMessage={successMessage}
        />
      )}

      {/* Confirmation Modal */}
      <Modal
        open={confirmationOpen}
        onClose={cancelConfirmation}
        closeAfterTransition
        slots={{ backdrop: Backdrop }}
      >
        <Fade in={confirmationOpen}>
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: isMobile ? "80%" : 350,
              bgcolor: "#3f3f41",
              borderRadius: 2,
              boxShadow: 24,
              p: 3,
            }}
          >
            <Typography
              variant="h6"
              component="h2"
              sx={{ color: "#C9A726", mb: 2 }}
            >
              Confirm Action
            </Typography>

            <Typography variant="body1" sx={{ color: "#fffbf9", mb: 3 }}>
              Are you sure you want to add "
              {itemType === "album"
                ? (item as IAlbumRequestResults).title
                : (item as IArtistRequestResults).name}
              " ?
            </Typography>

            <Box display="flex" justifyContent="space-between" gap={2}>
              <Button
                variant="text"
                onClick={cancelConfirmation}
                sx={{ color: "#fffbf9" }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={confirmAction}
                sx={{
                  backgroundColor: "#C9A726",
                  "&:hover": { backgroundColor: "#b8961f" },
                }}
              >
                Confirm
              </Button>
            </Box>
          </Box>
        </Fade>
      </Modal>
    </>
  );
};

export default AddToCollectionModal;
