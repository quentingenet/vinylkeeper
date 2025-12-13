import React, { useState, useCallback, memo, useEffect } from "react";
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import CloseIcon from "@mui/icons-material/Close";
import FavoriteIcon from "@mui/icons-material/Favorite";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  collectionApiService,
  CollectionListItemResponse,
} from "@services/CollectionApiService";
import { externalReferenceApiService } from "@services/ExternalReferenceService";
import {
  IAlbumRequestResults,
  IArtistRequestResults,
} from "@models/IRequestProxy";
import {
  AddToWishlistRequest,
  AddToCollectionRequest,
  AddToWishlistResponse,
  AddToCollectionResponse,
} from "@models/IExternalReference";
import useDetectMobile from "@hooks/useDetectMobile";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { format, parse, isValid } from "date-fns";
import VinylSpinner from "@components/UI/VinylSpinner";
import { truncateText, vinylStates, VinylStateEnum } from "@utils/GlobalUtils";
import { growItem } from "@utils/Animations";

interface AddToCollectionModalProps {
  open: boolean;
  onClose: () => void;
  item: IAlbumRequestResults | IArtistRequestResults | null;
  itemType: "album" | "artist";
}

interface AlbumStateData {
  state_cover?: VinylStateEnum | null;
  state_record?: VinylStateEnum | null;
  acquisition_month_year?: string | null;
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
  isAddingToCollection?: boolean; // New prop for collection addition state
  albumStateData?: AlbumStateData;
  onAlbumStateChange?: (field: keyof AlbumStateData, value: any) => void;
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
    const isError = messageType === "error";

    const handleDateChange = (newValue: Date | null) => {
      onAlbumStateChange?.(
        "acquisition_month_year",
        newValue ? format(newValue, "yyyy-MM") : null
      );
      setIsDatePickerOpen?.(false);
    };

    const handleDatePickerOpen = () => {
      setIsDatePickerOpen?.(true);
    };

    const handleDatePickerClose = () => {
      setIsDatePickerOpen?.(false);
    };

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
              Add "
              {itemType === "album"
                ? (item as IAlbumRequestResults).title
                : (item as IArtistRequestResults).title}
              " to a collection:
            </Typography>

            {/* Album States Accordion - Only show for albums */}
            {itemType === "album" && albumStateData && onAlbumStateChange && (
              <Accordion
                sx={{
                  backgroundColor: "#3f3f41",
                  color: "#fffbf9",
                  mb: 2,
                  "&:before": { display: "none" },
                  "& .MuiAccordionSummary-root": {
                    backgroundColor: "#1F1F1F",
                    color: "#C9A726",
                    fontWeight: "bold",
                  },
                  "& .MuiAccordionSummary-expandIconWrapper": {
                    color: "#C9A726",
                  },
                  "& .MuiAccordionDetails-root": {
                    backgroundColor: "#2a2a2a",
                    padding: "16px",
                  },
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Album states (Optional)
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box display="flex" flexDirection="column" gap={2}>
                    <Box display="flex" flexDirection="column" gap={2}>
                      <FormControl fullWidth size="small">
                        <InputLabel
                          id="cover-state-label"
                          sx={{
                            color: "#fffbf9",
                            "&.Mui-focused": { color: "#C9A726" },
                            "&.MuiInputLabel-shrink": { color: "#C9A726" },
                          }}
                        >
                          Cover state
                        </InputLabel>
                        <Select
                          labelId="cover-state-label"
                          id="cover-state-select"
                          value={albumStateData.state_cover || ""}
                          label="Cover state"
                          onChange={(e) =>
                            onAlbumStateChange(
                              "state_cover",
                              e.target.value || null
                            )
                          }
                          variant="outlined"
                          sx={{
                            color: "#fffbf9",
                            "& .MuiSelect-icon": { color: "#C9A726" },
                          }}
                        >
                          {vinylStates.map((state) => (
                            <MenuItem key={state.id} value={state.id}>
                              {state.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <FormControl fullWidth size="small">
                        <InputLabel
                          id="record-state-label"
                          sx={{
                            color: "#fffbf9",
                            "&.Mui-focused": { color: "#C9A726" },
                            "&.MuiInputLabel-shrink": { color: "#C9A726" },
                          }}
                        >
                          Record state
                        </InputLabel>
                        <Select
                          labelId="record-state-label"
                          id="record-state-select"
                          value={albumStateData.state_record || ""}
                          label="Record state"
                          onChange={(e) =>
                            onAlbumStateChange(
                              "state_record",
                              e.target.value || null
                            )
                          }
                          variant="outlined"
                          sx={{
                            color: "#fffbf9",
                            "& .MuiSelect-icon": { color: "#C9A726" },
                          }}
                        >
                          {vinylStates.map((state) => (
                            <MenuItem key={state.id} value={state.id}>
                              {state.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>

                    <DatePicker
                      label="Acquisition month"
                      value={
                        albumStateData.acquisition_month_year
                          ? parse(
                              albumStateData.acquisition_month_year,
                              "yyyy-MM",
                              new Date()
                            )
                          : null
                      }
                      onChange={handleDateChange}
                      open={isDatePickerOpen || false}
                      onOpen={handleDatePickerOpen}
                      onClose={handleDatePickerClose}
                      views={["month", "year"]}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          size: "small",
                          helperText: "Select acquisition month and year",
                          onClick: handleDatePickerOpen,
                          sx: {
                            color: "#fffbf9",
                            "& .MuiOutlinedInput-root": {
                              color: "#fffbf9",
                              "& fieldset": {
                                borderColor: "#C9A726",
                              },
                              "&:hover fieldset": {
                                borderColor: "#b38f1f",
                              },
                              "&.Mui-focused fieldset": {
                                borderColor: "#C9A726",
                              },
                              "&.Mui-disabled": {
                                color: "#999",
                                "& fieldset": {
                                  borderColor: "#666",
                                },
                              },
                            },
                            "& .MuiInputLabel-root": {
                              color: "#fffbf9",
                              "&.Mui-focused": {
                                color: "#C9A726",
                              },
                              "&.Mui-disabled": {
                                color: "#666",
                              },
                            },
                            "& .MuiFormHelperText-root": {
                              color: "#e4e4e4",
                            },
                          },
                        },
                        popper: {
                          sx: {
                            "& .MuiPaper-root": {
                              backgroundColor: "#3f3f41",
                              color: "#fffbf9",
                            },
                            "& .MuiPickersCalendarHeader-root": {
                              color: "#fffbf9",
                            },
                            "& .MuiPickersYear-yearButton": {
                              color: "#fffbf9",
                              "&.Mui-selected": {
                                backgroundColor: "#C9A726",
                                color: "#000",
                              },
                              "&:hover": {
                                backgroundColor: "rgba(201, 167, 38, 0.2)",
                              },
                            },
                            "& .MuiPickersMonth-monthButton": {
                              color: "#fffbf9",
                              "&.Mui-selected": {
                                backgroundColor: "#C9A726",
                                color: "#000",
                              },
                              "&:hover": {
                                backgroundColor: "rgba(201, 167, 38, 0.2)",
                              },
                            },
                          },
                        },
                      }}
                    />
                  </Box>
                </AccordionDetails>
              </Accordion>
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
                        // Click handled by ListItemButton below
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
  const [showCollectionSelection, setShowCollectionSelection] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [messageType, setMessageType] = useState<
    "success" | "warning" | "info" | "error"
  >("success");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Album state data
  const [albumStateData, setAlbumStateData] = useState<{
    state_record: VinylStateEnum | null;
    state_cover: VinylStateEnum | null;
    acquisition_month_year: string | null;
  }>({
    state_record: null,
    state_cover: null,
    acquisition_month_year: null,
  });

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

  const handleMutationSuccess = (
    queryKey: string,
    customMessage?: string,
    isNew?: boolean
  ) => {
    // Protect against multiple calls with empty data
    if (!customMessage && isNew === undefined) {
      return;
    }

    const successMessage = customMessage || `Successfully added to ${queryKey}`;

    // Determine message type based on context and isNew flag
    let messageType: "success" | "warning" | "info" | "error" = "success";

    if (customMessage?.includes("Error")) {
      messageType = "error";
    } else if (isNew === false) {
      // Item already exists
      messageType = "warning";
    } else if (isNew === true) {
      // New item added
      messageType = "success";
    } else {
      // Fallback to text analysis if isNew is undefined
      if (customMessage?.includes("Already have")) {
        messageType = "warning";
      } else if (customMessage?.includes("Added")) {
        messageType = "success";
      }
    }

    setMessageType(messageType);
    setSuccessMessage(successMessage);
    setIsDatePickerOpen(false); // Close date picker on success
    setTimeout(() => {
      setSuccessMessage("");
      handleClose(); // Close modal after success message
    }, 1500);
  };

  const handleMutationError = (error: Error) => {
    const errorMessage = error.message.includes("Error adding to")
      ? error.message
      : "An error occurred while adding to collection";
    setSuccessMessage(errorMessage);
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  const handleAlbumStateChange = (field: keyof AlbumStateData, value: any) => {
    setAlbumStateData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const addToWishlistMutation = useMutation({
    mutationFn: (albumData: AddToWishlistRequest) => {
      return externalReferenceApiService.addToWishlist(albumData);
    },
    onSuccess: (response) => {
      // Invalidate wishlist queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      handleMutationSuccess("wishlist", response.message, response.is_new);
    },
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
    onSuccess: (response, variables) => {
      // Invalidate all collection-related queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["collectionDetails"] });
      queryClient.invalidateQueries({ queryKey: ["collectionAlbums"] });
      // Invalidate specific collection that was updated
      queryClient.invalidateQueries({
        queryKey: ["collectionDetails", variables.collectionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["collectionAlbums", variables.collectionId],
      });
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
    // Prevent multiple calls while mutation is pending
    if (addToCollectionMutation.isPending) {
      return;
    }

    setSuccessMessage("Adding to collection...");

    try {
      const response = await addToCollectionMutation.mutateAsync({
        collectionId: collectionId,
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

      // Response is handled by mutation onSuccess callback
      // No need to call handleMutationSuccess here
    } catch (err) {
      handleMutationError(
        err instanceof Error ? err : new Error("An error occurred")
      );
    }
  };

  const handleClose = useCallback(() => {
    setShowCollectionSelection(false);
    setSuccessMessage("");
    setIsDatePickerOpen(false); // Close date picker when modal closes
    // Reset album state data when modal is closed
    setAlbumStateData({
      state_cover: null,
      state_record: null,
      acquisition_month_year: null,
    });
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
              <IconButton onClick={onClose} size="small">
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
                  addToWishlistMutation.isPending
                    ? "Adding to wishlist..."
                    : "Add to wishlist"
                }
                arrow
                sx={{
                  "& .MuiTooltip-tooltip": {
                    backgroundColor: addToWishlistMutation.isPending
                      ? "#4caf50"
                      : "#C9A726",
                    color: addToWishlistMutation.isPending ? "#fff" : "#000",
                    fontSize: "0.875rem",
                    fontWeight: addToWishlistMutation.isPending
                      ? "bold"
                      : "normal",
                  },
                }}
              >
                <span style={{ display: "flex", width: "100%" }}>
                  <Button
                    variant="contained"
                    startIcon={<FavoriteIcon />}
                    onClick={handleAddToWishlist}
                    disabled={addToWishlistMutation.isPending}
                    sx={{
                      bgcolor: "#C9A726",
                      "&:hover": { bgcolor: "#b08c1f" },
                      "&:disabled": { bgcolor: "#666" },
                      width: "100%",
                    }}
                  >
                    {addToWishlistMutation.isPending ? (
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
        onAddToCollection={handleAddToCollection}
        successMessage={successMessage}
        messageType={messageType}
        isLoading={addToCollectionMutation.isPending}
        isAddingToCollection={addToCollectionMutation.isPending}
        albumStateData={albumStateData}
        onAlbumStateChange={handleAlbumStateChange}
        isDatePickerOpen={isDatePickerOpen}
        setIsDatePickerOpen={setIsDatePickerOpen}
      />
    </>
  );
};

export default AddToCollectionModal;
