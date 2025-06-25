import React, { useState, useEffect } from "react";
import {
  Modal,
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  Chip,
  Fade,
  Backdrop,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { musicStreamingService } from "@services/MusicStreamingService";
import {
  useAlbumMetadata,
  useArtistMetadata,
} from "@services/MusicMetadataService";
import useDetectMobile from "@hooks/useDetectMobile";
import { useUpdateAlbumStates } from "@hooks/useCollections";
import { useParams } from "react-router-dom";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { format, parse } from "date-fns";
import VinylSpinner from "@components/UI/VinylSpinner";
import { vinylStates } from "@utils/GlobalUtils";

export interface PlaybackItem {
  id: string;
  title: string;
  artist: string;
  image_url?: string;
  itemType: "album" | "artist";
  internalId?: string; // Internal ID for database operations
  albumData?: {
    state_record?: string;
    state_cover?: string;
    acquisition_month_year?: string;
  };
}

interface PlaybackModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: PlaybackItem | null;
  context?: "wishlist" | "collection";
  isOwner?: boolean;
  isExplorePage?: boolean;
}

export default function PlaybackModal({
  isOpen,
  onClose,
  item,
  context,
  isOwner,
  isExplorePage,
}: PlaybackModalProps) {
  const { isMobile } = useDetectMobile();
  const { id: collectionId } = useParams<{ id: string }>();
  const updateAlbumStatesMutation = useUpdateAlbumStates();

  // States for album conditions
  const [coverState, setCoverState] = useState<string | null>(null);
  const [discState, setDiscState] = useState<string | null>(null);
  const [purchaseDate, setPurchaseDate] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Function to reset album states
  const resetAlbumStates = () => {
    setCoverState(null);
    setDiscState(null);
    setPurchaseDate("");
    setIsUpdating(false);
    setIsDatePickerOpen(false);
  };

  // Initialize states with existing data when item changes
  useEffect(() => {
    if (item?.itemType === "album" && item.albumData) {
      setCoverState(item.albumData.state_cover || null);
      setDiscState(item.albumData.state_record || null);

      // Set acquisition month/year directly from the YYYY-MM format
      if (item.albumData.acquisition_month_year) {
        setPurchaseDate(item.albumData.acquisition_month_year);
      } else {
        setPurchaseDate("");
      }
    } else if (item?.itemType === "artist") {
      resetAlbumStates();
    }
  }, [item?.id, item?.itemType]);

  // Reset states when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetAlbumStates();
      setShowSuccessToast(false);
    }
  }, [isOpen]);

  const {
    data: albumMetadata,
    isLoading: isAlbumLoading,
    error: albumError,
  } = useAlbumMetadata(
    item?.itemType === "album"
      ? {
          id: item.id,
          artist: item.artist,
          title: item.title,
        }
      : undefined
  );

  const {
    data: artistMetadata,
    isLoading: isArtistLoading,
    error: artistError,
  } = useArtistMetadata(item?.itemType === "artist" ? item.id : undefined);

  const metadata = item?.itemType === "album" ? albumMetadata : artistMetadata;
  const isLoading =
    item?.itemType === "album" ? isAlbumLoading : isArtistLoading;
  const error = item?.itemType === "album" ? albumError : artistError;

  if (!item) return null;

  const handleStreamingRedirect = (
    platformName: string,
    itemType: "album" | "artist"
  ) => {
    if (!item) return;

    const queryParts: string[] = [];

    if (itemType === "album") {
      if (item.artist) queryParts.push(item.artist);
      queryParts.push(item.title);
    } else {
      queryParts.push(item.title);
    }

    const searchQuery = encodeURIComponent(queryParts.join(" "));
    const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);

    let url = "";

    switch (platformName.toLowerCase()) {
      case "spotify":
        url = `${import.meta.env.VITE_SPOTIFY_WEB_URL}/${searchQuery}`;
        break;

      case "deezer":
        url = `${import.meta.env.VITE_DEEZER_WEB_URL}/${searchQuery}`;
        break;

      case "youtubemusic":
      case "youtube music":
        url = `${import.meta.env.VITE_YOUTUBE_MUSIC_URL}?q=${searchQuery}`;
        break;

      default:
        console.warn("Unsupported platform:", platformName);
        return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleUpdateAlbumStates = async () => {
    if (!item || item.itemType !== "album" || !collectionId) {
      return;
    }

    if (!item.internalId) {
      return;
    }

    const albumId = item.internalId;

    setIsUpdating(true);
    try {
      const updateData = {
        state_record: discState,
        state_cover: coverState,
        acquisition_month_year: purchaseDate || null,
      };

      const result = await updateAlbumStatesMutation.mutateAsync({
        collectionId: parseInt(collectionId),
        albumId: parseInt(albumId),
        data: updateData,
      });

      // Show success toast
      setShowSuccessToast(true);
    } catch (error) {
      // Error handling is done by the mutation
    } finally {
      setIsUpdating(false);
    }
  };

  const modalStyle = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: isMobile ? "75%" : "500px",
    maxHeight: "80vh",
    bgcolor: "#3f3f41",
    borderRadius: 2,
    boxShadow: 24,
    p: 3,
    overflow: "auto",
  };

  return (
    <>
      <Modal
        open={isOpen}
        onClose={onClose}
        closeAfterTransition
        slots={{ backdrop: Backdrop }}
      >
        <Fade in={isOpen}>
          <Box sx={modalStyle}>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={2}
            >
              <Typography
                variant="h5"
                component="h2"
                sx={{ color: "#C9A726", fontWeight: "bold" }}
              >
                {item?.itemType === "album"
                  ? "Album Details"
                  : "Artist Details"}
              </Typography>
              <IconButton onClick={onClose} size="small">
                <CloseIcon sx={{ color: "#fffbf9" }} />
              </IconButton>
            </Box>

            {isLoading ? (
              <Box display="flex" justifyContent="center" my={4}>
                <VinylSpinner />
              </Box>
            ) : error ? (
              <Box display="flex" justifyContent="center" my={4}>
                <Typography sx={{ color: "#e4e4e4" }}>
                  {error instanceof Error ? error.message : "An error occurred"}
                </Typography>
              </Box>
            ) : (
              <>
                <Box display="flex" alignItems="center" mb={3}>
                  {(item?.itemType === "album"
                    ? albumMetadata?.image_url
                    : item?.image_url) && (
                    <img
                      src={
                        item?.itemType === "album"
                          ? albumMetadata?.image_url
                          : item?.image_url
                      }
                      alt={item.title}
                      style={{
                        width: 120,
                        height: 120,
                        objectFit: "cover",
                        borderRadius: 8,
                        marginRight: 16,
                      }}
                    />
                  )}
                  <Box>
                    <Typography
                      variant="h6"
                      fontWeight="bold"
                      sx={{ color: "#C9A726", mb: 1 }}
                    >
                      {item.title}
                    </Typography>
                  </Box>
                </Box>
                {/* Genres Section */}
                {item?.itemType === "album" &&
                  albumMetadata?.genres &&
                  albumMetadata.genres.length > 0 && (
                    <Box mb={3}>
                      <Typography
                        variant="subtitle1"
                        sx={{ color: "#C9A726", mb: 1 }}
                      >
                        Genres
                      </Typography>
                      <Box display="flex" flexWrap="wrap" gap={1}>
                        {[
                          ...new Set([
                            ...(albumMetadata.genres || []),
                            ...(albumMetadata.styles || []),
                          ]),
                        ].map((genre, index) => (
                          <Chip
                            key={index}
                            label={genre}
                            size="small"
                            sx={{
                              backgroundColor: "#C9A726",
                              color: "#fffbf9",
                              "&:hover": {
                                backgroundColor: "#b38f1f",
                              },
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}

                {/* Album States Accordion */}
                {item?.itemType === "album" &&
                  context === "collection" &&
                  (!isExplorePage ||
                    coverState ||
                    discState ||
                    purchaseDate) && (
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
                        },
                      }}
                    >
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          Album states
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Box display="flex" flexDirection="column" gap={2}>
                          <FormControl fullWidth size="small">
                            <InputLabel
                              id="cover-state-label"
                              sx={{
                                color: "#e4e4e4",
                                "&.Mui-focused": { color: "#C9A726" },
                                "&.MuiInputLabel-shrink": { color: "#C9A726" },
                              }}
                            >
                              Cover state
                            </InputLabel>
                            <Select
                              labelId="cover-state-label"
                              id="cover-state-select"
                              value={coverState || ""}
                              label="Cover state"
                              onChange={(e) =>
                                setCoverState(e.target.value || null)
                              }
                              disabled={isOwner !== true}
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
                                color: "#e4e4e4",
                                "&.Mui-focused": { color: "#C9A726" },
                                "&.MuiInputLabel-shrink": { color: "#C9A726" },
                              }}
                            >
                              Record state
                            </InputLabel>
                            <Select
                              labelId="record-state-label"
                              id="record-state-select"
                              value={discState || ""}
                              label="Record state"
                              onChange={(e) =>
                                setDiscState(e.target.value || null)
                              }
                              disabled={isOwner !== true}
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

                          <DatePicker
                            label="Acquisition month"
                            value={
                              purchaseDate
                                ? parse(purchaseDate, "yyyy-MM", new Date())
                                : null
                            }
                            onChange={(newValue) => {
                              setPurchaseDate(
                                newValue ? format(newValue, "yyyy-MM") : ""
                              );
                              setIsDatePickerOpen(false);
                            }}
                            open={isDatePickerOpen}
                            onOpen={() =>
                              isOwner === true && setIsDatePickerOpen(true)
                            }
                            onClose={() => setIsDatePickerOpen(false)}
                            disabled={isOwner !== true}
                            views={["month", "year"]}
                            slotProps={{
                              textField: {
                                fullWidth: true,
                                size: "small",
                                helperText:
                                  isOwner === true
                                    ? "Select acquisition month and year"
                                    : "Read-only",
                                onClick: () =>
                                  isOwner === true && setIsDatePickerOpen(true),
                                sx: {
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
                                      backgroundColor:
                                        "rgba(201, 167, 38, 0.2)",
                                    },
                                  },
                                  "& .MuiPickersMonth-monthButton": {
                                    color: "#fffbf9",
                                    "&.Mui-selected": {
                                      backgroundColor: "#C9A726",
                                      color: "#000",
                                    },
                                    "&:hover": {
                                      backgroundColor:
                                        "rgba(201, 167, 38, 0.2)",
                                    },
                                  },
                                },
                              },
                            }}
                          />

                          {isOwner === true && (
                            <Button
                              variant="contained"
                              onClick={handleUpdateAlbumStates}
                              disabled={isUpdating}
                              sx={{
                                backgroundColor: "#C9A726",
                                color: "#1F1F1F",
                                fontWeight: "bold",
                                mt: 2,
                                "&:hover": {
                                  backgroundColor: "#b38f1f",
                                },
                                "&:disabled": {
                                  backgroundColor: "#666",
                                  color: "#999",
                                },
                              }}
                            >
                              {isUpdating
                                ? "Updating..."
                                : "Update Album States"}
                            </Button>
                          )}
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  )}

                {/* Tracklist Accordion */}
                {item?.itemType === "album" && albumMetadata?.tracklist && (
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
                      },
                    }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        Tracklist
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <List sx={{ maxHeight: 200, overflow: "auto", p: 0 }}>
                        {albumMetadata.tracklist.map((track, index) => (
                          <ListItem key={index} sx={{ py: 0.5, px: 0 }}>
                            <ListItemText
                              primary={
                                <Typography sx={{ color: "#fffbf9" }}>
                                  {track.position} {track.title}
                                </Typography>
                              }
                              secondary={
                                <Typography sx={{ color: "#e4e4e4" }}>
                                  {track.duration}
                                </Typography>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </AccordionDetails>
                  </Accordion>
                )}

                {/* Artist Biography */}
                {item?.itemType === "artist" && artistMetadata?.biography && (
                  <Box mb={3}>
                    <Typography
                      variant="subtitle1"
                      sx={{ color: "#C9A726", mb: 1 }}
                    >
                      Biography
                    </Typography>
                    <Box
                      sx={{
                        p: 2,
                        maxHeight: 200,
                        overflow: "auto",
                      }}
                    >
                      <Typography
                        sx={{
                          color: "#fffbf9",
                          whiteSpace: "pre-line",
                          lineHeight: 1.6,
                        }}
                      >
                        {artistMetadata.biography}
                      </Typography>
                    </Box>
                  </Box>
                )}

                {/* Artist Genres */}
                {item?.itemType === "artist" &&
                  artistMetadata?.genres &&
                  artistMetadata.genres.length > 0 && (
                    <Box mb={3}>
                      <Typography
                        variant="subtitle1"
                        sx={{ color: "#C9A726", mb: 1 }}
                      >
                        Genres
                      </Typography>
                      <Box display="flex" flexWrap="wrap" gap={1}>
                        {artistMetadata.genres.map((genre, index) => (
                          <Chip
                            key={index}
                            label={genre}
                            size="small"
                            sx={{
                              backgroundColor: "#C9A726",
                              color: "#fffbf9",
                              "&:hover": {
                                backgroundColor: "#b38f1f",
                              },
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}

                {/* Listen on Accordion */}
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
                    },
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      Listen on
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box display="flex" flexDirection="column" gap={2}>
                      {musicStreamingService.getPlatforms().map((platform) => (
                        <Button
                          key={platform.name}
                          variant="contained"
                          fullWidth
                          onClick={() =>
                            handleStreamingRedirect(
                              platform.name,
                              item?.itemType
                            )
                          }
                          sx={{
                            backgroundColor: "#1F1F1F",
                            color: "#C9A726",
                            "&:hover": {
                              backgroundColor: "#C9A726",
                              color: "#1F1F1F",
                            },
                            py: 1.5,
                          }}
                          startIcon={<span>{platform.icon}</span>}
                        >
                          Listen on {platform.name}
                        </Button>
                      ))}
                    </Box>
                  </AccordionDetails>
                </Accordion>

                {(!albumMetadata?.tracklist && item?.itemType === "album") ||
                (!artistMetadata?.biography && item?.itemType === "artist") ? (
                  <Typography
                    variant="body2"
                    sx={{ color: "#e4e4e4", mt: 2, textAlign: "center" }}
                  >
                    {item?.itemType === "album"
                      ? "Tracklist not available"
                      : "Biography not available"}
                  </Typography>
                ) : null}
              </>
            )}
          </Box>
        </Fade>
      </Modal>

      <Snackbar
        open={showSuccessToast}
        autoHideDuration={3000}
        onClose={() => setShowSuccessToast(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setShowSuccessToast(false)}
          severity="success"
          sx={{
            backgroundColor: "#C9A726",
            color: "#1F1F1F",
            fontWeight: "bold",
            "& .MuiAlert-icon": {
              color: "#1F1F1F",
            },
          }}
        >
          Album states updated successfully!
        </Alert>
      </Snackbar>
    </>
  );
}
