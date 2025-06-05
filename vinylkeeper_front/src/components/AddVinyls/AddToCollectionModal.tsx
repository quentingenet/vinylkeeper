import React, { useState, useCallback, memo } from "react";
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
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import FavoriteIcon from "@mui/icons-material/Favorite";
import {
  IAlbumRequestResults,
  IArtistRequestResults,
} from "@models/IRequestProxy";
import { ICollection } from "@models/ICollectionForm";
import {
  collectionApiService,
  type CollectionResponse,
} from "@services/CollectionApiService";
import { externalReferenceApiService } from "@services/ExternalReferenceService";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useDetectMobile from "@hooks/useDetectMobile";
import {
  AddToWishlistRequest,
  AddToCollectionRequest,
} from "@models/IExternalReference";

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
  collections: CollectionResponse[];
  onAddToCollection: (collectionId: number) => void;
  successMessage?: string;
  isLoading?: boolean;
}

const modalStyle = (isMobile: boolean) => ({
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: isMobile ? "90%" : 350,
  maxWidth: "90vw",
  bgcolor: "#3f3f41",
  borderRadius: 2,
  boxShadow: 24,
  p: 2,
  maxHeight: "80vh",
  overflow: "auto",
  "& .MuiListItemText-primary": {
    wordBreak: "break-word",
  },
  "& .MuiListItemText-secondary": {
    wordBreak: "break-word",
  },
});

const alertStyle = (isError: boolean = false) => ({
  width: "auto",
  maxWidth: "100%",
  mb: 2,
  backgroundColor: isError
    ? "rgba(211, 47, 47, 0.1)"
    : "rgba(46, 125, 50, 0.1)",
  color: isError ? "#ff6b6b" : "#4caf50",
  wordBreak: "break-word",
  whiteSpace: "normal",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

const buttonStyle = {
  color: "#fffbf9",
  "&:hover": { color: "#C9A726" },
};

const CollectionSelectionModal = memo<CollectionSelectionModalProps>(
  ({
    open,
    onClose,
    onBack,
    item,
    itemType,
    collections,
    onAddToCollection,
    successMessage,
    isLoading = false,
  }) => {
    const { isMobile } = useDetectMobile();
    const isError = successMessage?.includes("Error");

    return (
      <Modal
        open={open}
        onClose={onClose}
        closeAfterTransition
        slots={{ backdrop: Backdrop }}
      >
        <Fade in={open}>
          <Box sx={modalStyle(isMobile)}>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={2}
            >
              <Typography variant="h6" component="h2" sx={{ color: "#C9A726" }}>
                Select a collection
              </Typography>
              <IconButton onClick={onClose} size="small">
                <CloseIcon sx={{ color: "#fffbf9" }} />
              </IconButton>
            </Box>

            {successMessage && (
              <Alert
                severity={isError ? "error" : "success"}
                sx={alertStyle(isError)}
              >
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

            {isLoading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress sx={{ color: "#C9A726" }} />
              </Box>
            ) : collections.length === 0 ? (
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
                        sx={{
                          borderRadius: 1,
                          transition: "background-color 0.2s",
                          "&:hover": {
                            backgroundColor: "rgba(201, 167, 38, 0.1)",
                          },
                        }}
                      >
                        <ListItemText
                          primary={collection.name}
                          secondary={collection.description || "No description"}
                          sx={{
                            "& .MuiListItemText-primary": { color: "#fffbf9" },
                            "& .MuiListItemText-secondary": {
                              color: "#e4e4e4",
                            },
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
              <Button variant="text" onClick={onBack} sx={buttonStyle}>
                Back
              </Button>
              <Button variant="text" onClick={onClose} sx={buttonStyle}>
                Cancel
              </Button>
            </Box>
          </Box>
        </Fade>
      </Modal>
    );
  }
);

CollectionSelectionModal.displayName = "CollectionSelectionModal";

const AddToCollectionModal: React.FC<AddToCollectionModalProps> = ({
  open,
  onClose,
  item,
  itemType,
}) => {
  const [showCollectionSelection, setShowCollectionSelection] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [selectedCollectionId, setSelectedCollectionId] = useState<
    number | null
  >(null);
  const { isMobile } = useDetectMobile();
  const queryClient = useQueryClient();
  const isError = successMessage?.includes("Error");

  const { data: collectionsData, isLoading: collectionsLoading } = useQuery({
    queryKey: ["collections"],
    queryFn: () => collectionApiService.getCollections(1, 100),
    enabled: open,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const collections = collectionsData?.items || [];

  const handleMutationSuccess = (queryKey: string) => {
    queryClient.invalidateQueries({ queryKey: [queryKey] });
    setSuccessMessage("Successfully added!");
    setTimeout(() => {
      setSuccessMessage("");
      onClose();
    }, 2000);
  };

  const handleMutationError = (error: Error) => {
    const errorMessage = error.message.includes("Error adding to")
      ? error.message
      : "An error occurred while adding to collection";
    setSuccessMessage(errorMessage);
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  const addToWishlistMutation = useMutation({
    mutationFn: (albumData: AddToWishlistRequest) => {
      return externalReferenceApiService.addToWishlist(albumData);
    },
    onSuccess: () => handleMutationSuccess("wishlist"),
    onError: handleMutationError,
  });

  const addToCollectionMutation = useMutation({
    mutationFn: (data: {
      collectionId: number;
      item: AddToCollectionRequest;
    }) => {
      return externalReferenceApiService.addToCollection(
        data.collectionId,
        data.item
      );
    },
    onSuccess: () => handleMutationSuccess("collections"),
    onError: handleMutationError,
  });

  const handleAddToWishlist = () => {
    if (!item) return;
    addToWishlistMutation.mutate({
      external_id: item.id.toString(),
      entity_type: itemType.toUpperCase() as "ALBUM" | "ARTIST",
      title:
        itemType === "album"
          ? (item as IAlbumRequestResults).title || item.id.toString()
          : (item as IArtistRequestResults).name || item.id.toString(),
      image_url: item.picture || "",
      source: "DISCOGS",
    });
  };

  const handleAddToCollection = (collectionId: number) => {
    if (!item) return;
    setSelectedCollectionId(collectionId);
    addToCollectionMutation.mutate({
      collectionId,
      item: {
        external_id: item.id.toString(),
        entity_type: itemType.toUpperCase() as "ALBUM" | "ARTIST",
        title:
          itemType === "album"
            ? (item as IAlbumRequestResults).title || item.id.toString()
            : (item as IArtistRequestResults).name || item.id.toString(),
        image_url: item.picture || "",
        source: "DISCOGS",
      },
    });
  };

  const handleClose = useCallback(() => {
    setShowCollectionSelection(false);
    setSuccessMessage("");
    setSelectedCollectionId(null);
    onClose();
  }, [onClose]);

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
          <Box sx={modalStyle(isMobile)}>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={2}
            >
              <Typography variant="h6" component="h2" sx={{ color: "#C9A726" }}>
                Add to collection
              </Typography>
              <IconButton onClick={handleClose} size="small">
                <CloseIcon sx={{ color: "#fffbf9" }} />
              </IconButton>
            </Box>

            {successMessage && (
              <Alert
                severity={isError ? "error" : "success"}
                sx={alertStyle(isError)}
              >
                {successMessage}
              </Alert>
            )}

            <Box display="flex" flexDirection="column" gap={2}>
              <Tooltip title="Add to wishlist">
                <Button
                  variant="contained"
                  startIcon={<FavoriteIcon />}
                  onClick={handleAddToWishlist}
                  disabled={addToWishlistMutation.isPending}
                  sx={{
                    bgcolor: "#C9A726",
                    "&:hover": { bgcolor: "#b08c1f" },
                    "&:disabled": { bgcolor: "#666" },
                  }}
                >
                  {addToWishlistMutation.isPending ? (
                    <CircularProgress size={24} sx={{ color: "#fff" }} />
                  ) : (
                    "Add to wishlist"
                  )}
                </Button>
              </Tooltip>

              <Tooltip title="Add to existing collection">
                <Button
                  variant="outlined"
                  onClick={() => setShowCollectionSelection(true)}
                  disabled={collectionsLoading}
                  sx={{
                    color: "#C9A726",
                    "&:hover": {
                      borderColor: "#C9A726",
                      bgcolor: "#C9A726",
                      color: "#1F1F1F",
                    },
                    "&:disabled": {
                      borderColor: "#666",
                      color: "#666",
                    },
                  }}
                >
                  {collectionsLoading ? (
                    <CircularProgress size={24} sx={{ color: "#C9A726" }} />
                  ) : (
                    "Add to collection"
                  )}
                </Button>
              </Tooltip>
            </Box>
          </Box>
        </Fade>
      </Modal>

      <CollectionSelectionModal
        open={showCollectionSelection}
        onClose={() => setShowCollectionSelection(false)}
        onBack={() => setShowCollectionSelection(false)}
        item={item}
        itemType={itemType}
        collections={collections}
        onAddToCollection={handleAddToCollection}
        successMessage={successMessage}
        isLoading={addToCollectionMutation.isPending}
      />
    </>
  );
};

export default AddToCollectionModal;
