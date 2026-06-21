import React, { memo } from "react";
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
  Tooltip,
  Stack,
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import CloseIcon from "@mui/icons-material/Close";
import FavoriteIcon from "@mui/icons-material/Favorite";
import {
  IAlbumRequestResults,
  IArtistRequestResults,
} from "@models/IRequestProxy";
import { type CollectionListItemResponse } from "@services/CollectionApiService";
import useDetectMobile from "@hooks/useDetectMobile";
import VinylSpinner from "@components/UI/VinylSpinner";
import { truncateText } from "@utils/GlobalUtils";
import { growItem } from "@utils/Animations";
import { useAddToCollection, type AlbumStateData } from "@hooks/useAddToCollection";
import AlbumStateForm from "@components/AddVinyls/AlbumStateForm";

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
  collections: CollectionListItemResponse[];
  onAddToCollection: (collectionId: number) => void;
  successMessage?: string;
  messageType?: "success" | "warning" | "info" | "error";
  isLoading?: boolean;
  isAddingToCollection?: boolean;
  albumStateData?: AlbumStateData;
  onAlbumStateChange?: (
    field: keyof AlbumStateData,
    value: AlbumStateData[keyof AlbumStateData]
  ) => void;
  isDatePickerOpen?: boolean;
  setIsDatePickerOpen?: (open: boolean) => void;
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
  "& .MuiListItemText-primary": { wordBreak: "break-word" },
  "& .MuiListItemText-secondary": { wordBreak: "break-word" },
});

const getAlertStyle = (
  messageType: "success" | "warning" | "info" | "error"
) => ({
  width: "auto",
  maxWidth: "100%",
  mb: 2,
  backgroundColor:
    messageType === "error"
      ? "rgba(211, 47, 47, 0.1)"
      : messageType === "warning"
      ? "rgba(255, 152, 0, 0.1)"
      : messageType === "info"
      ? "rgba(33, 150, 243, 0.1)"
      : "rgba(46, 125, 50, 0.1)",
  color:
    messageType === "error"
      ? "#ff6b6b"
      : messageType === "warning"
      ? "#ff9800"
      : messageType === "info"
      ? "#2196f3"
      : "#4caf50",
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
    item,
    itemType,
    collections,
    onAddToCollection,
    successMessage,
    messageType = "success",
    isLoading = false,
    isAddingToCollection = false,
    albumStateData,
    onAlbumStateChange,
    isDatePickerOpen,
    setIsDatePickerOpen,
  }) => {
    const { isMobile } = useDetectMobile();

    return (
      <Modal
        open={open}
        onClose={onClose}
        closeAfterTransition
        slots={{ backdrop: Backdrop }}
        disableAutoFocus
        disableEnforceFocus
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
              <Alert severity={messageType} sx={getAlertStyle(messageType)}>
                {successMessage}
              </Alert>
            )}

            <Typography variant="body2" sx={{ color: "#fffbf9" }} mb={2}>
              Add &ldquo;
              {itemType === "album"
                ? (item as IAlbumRequestResults).title
                : (item as IArtistRequestResults).title}
              &rdquo; to a collection:
            </Typography>

            {itemType === "album" && albumStateData && onAlbumStateChange && (
              <AlbumStateForm
                albumStateData={albumStateData}
                onAlbumStateChange={onAlbumStateChange}
                isDatePickerOpen={isDatePickerOpen ?? false}
                setIsDatePickerOpen={setIsDatePickerOpen ?? (() => {})}
              />
            )}

            {isLoading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <VinylSpinner />
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
                    <Tooltip
                      title={
                        isAddingToCollection
                          ? "Adding to collection..."
                          : "Click to add to collection"
                      }
                      arrow
                      sx={{
                        "& .MuiTooltip-tooltip": {
                          backgroundColor: isAddingToCollection
                            ? "#4caf50"
                            : "#C9A726",
                          color: isAddingToCollection ? "#fff" : "#000",
                          fontSize: "0.875rem",
                          fontWeight: isAddingToCollection ? "bold" : "normal",
                        },
                      }}
                    >
                      <Stack
                        display="flex"
                        justifyContent="center"
                        alignItems="center"
                        direction="row"
                        spacing={1}
                        sx={{
                          cursor: isAddingToCollection ? "wait" : "pointer",
                        }}
                      >
                        <AddCircleOutlineIcon
                          fontSize="large"
                          sx={{
                            color: "#C9A726",
                            animation: `${growItem} 1s ease infinite`,
                          }}
                        />
                        <ListItem disablePadding>
                          <ListItemButton
                            onClick={() => onAddToCollection(collection.id)}
                            disabled={isAddingToCollection}
                            sx={{
                              borderRadius: 1,
                              transition: "background-color 0.2s",
                              "&:hover": {
                                backgroundColor: "rgba(201, 167, 38, 0.1)",
                              },
                            }}
                          >
                            <ListItemText
                              primary={truncateText(collection.name, 25)}
                              secondary={
                                collection.description
                                  ? truncateText(collection.description, 30)
                                  : "No description"
                              }
                              sx={{
                                "& .MuiListItemText-primary": {
                                  color: "#fffbf9",
                                },
                                "& .MuiListItemText-secondary": {
                                  color: "#e4e4e4",
                                },
                              }}
                            />
                          </ListItemButton>
                        </ListItem>
                        <Divider sx={{ bgcolor: "#666" }} />
                      </Stack>
                    </Tooltip>
                  </React.Fragment>
                ))}
              </List>
            )}

            <Box display="flex" justifyContent="flex-end" mt={3}>
              <Button variant="text" onClick={onClose} sx={buttonStyle}>
                Back
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
  const { isMobile } = useDetectMobile();
  const {
    showCollectionSelection,
    setShowCollectionSelection,
    successMessage,
    messageType,
    albumStateData,
    isDatePickerOpen,
    setIsDatePickerOpen,
    collections,
    collectionsLoading,
    isAddingToWishlist,
    isAddingToCollection,
    handleAlbumStateChange,
    handleAddToWishlist,
    handleAddToCollection,
    handleClose,
  } = useAddToCollection(item, itemType, open, onClose);

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
              <Alert severity={messageType} sx={getAlertStyle(messageType)}>
                {successMessage}
              </Alert>
            )}

            <Box display="flex" flexDirection="column" gap={2}>
              <Tooltip
                title={
                  isAddingToWishlist
                    ? "Adding to wishlist..."
                    : "Add to wishlist"
                }
                arrow
                sx={{
                  "& .MuiTooltip-tooltip": {
                    backgroundColor: isAddingToWishlist ? "#4caf50" : "#C9A726",
                    color: isAddingToWishlist ? "#fff" : "#000",
                    fontSize: "0.875rem",
                    fontWeight: isAddingToWishlist ? "bold" : "normal",
                  },
                }}
              >
                <span style={{ display: "flex", width: "100%" }}>
                  <Button
                    variant="contained"
                    startIcon={<FavoriteIcon />}
                    onClick={handleAddToWishlist}
                    disabled={isAddingToWishlist}
                    sx={{
                      bgcolor: "#C9A726",
                      "&:hover": { bgcolor: "#b08c1f" },
                      "&:disabled": { bgcolor: "#666" },
                      width: "100%",
                    }}
                  >
                    {isAddingToWishlist ? (
                      <VinylSpinner size={24} />
                    ) : (
                      "Add to wishlist"
                    )}
                  </Button>
                </span>
              </Tooltip>

              <Tooltip
                title={
                  collectionsLoading
                    ? "Loading collections..."
                    : "Add to existing collection"
                }
                arrow
                sx={{
                  "& .MuiTooltip-tooltip": {
                    backgroundColor: collectionsLoading ? "#4caf50" : "#C9A726",
                    color: collectionsLoading ? "#fff" : "#000",
                    fontSize: "0.875rem",
                    fontWeight: collectionsLoading ? "bold" : "normal",
                  },
                }}
              >
                <span style={{ display: "flex", width: "100%" }}>
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
                      width: "100%",
                    }}
                  >
                    {collectionsLoading ? (
                      <VinylSpinner size={24} />
                    ) : (
                      "Add to collection"
                    )}
                  </Button>
                </span>
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
        onAddToCollection={(collectionId) => {
          void handleAddToCollection(collectionId);
        }}
        successMessage={successMessage}
        messageType={messageType}
        isLoading={collectionsLoading}
        isAddingToCollection={isAddingToCollection}
        albumStateData={albumStateData}
        onAlbumStateChange={handleAlbumStateChange}
        isDatePickerOpen={isDatePickerOpen}
        setIsDatePickerOpen={setIsDatePickerOpen}
      />
    </>
  );
};

export default AddToCollectionModal;
