import { useState, useEffect } from "react";
import {
  Modal,
  Box,
  Typography,
  Chip,
  Fade,
  Backdrop,
  IconButton,
  Snackbar,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import {
  useAlbumMetadata,
  useArtistMetadata,
} from "@services/MusicMetadataService";
import useDetectMobile from "@hooks/useDetectMobile";
import { useUpdateAlbumStates } from "@hooks/useCollections";
import { useParams } from "react-router-dom";
import { format } from "date-fns";
import VinylSpinner from "@components/UI/VinylSpinner";
import { VinylStateEnum } from "@utils/GlobalUtils";
import { buildProxyImageUrl } from "@utils/ImageProxyHelper";
import AlbumStateEditor from "@components/Modals/AlbumStateEditor";
import StreamingLinksAccordion from "@components/Modals/StreamingLinksAccordion";
import TracklistAccordion from "@components/Modals/TracklistAccordion";

export interface PlaybackItem {
  id: string;
  title: string;
  artist: string;
  image_url?: string;
  itemType: "album" | "artist";
  internalId?: string;
  albumData?: {
    state_record?: VinylStateEnum;
    state_cover?: VinylStateEnum;
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

  const [coverState, setCoverState] = useState<VinylStateEnum | null>(null);
  const [discState, setDiscState] = useState<VinylStateEnum | null>(null);
  const [purchaseDate, setPurchaseDate] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const resetAlbumStates = () => {
    setCoverState(null);
    setDiscState(null);
    setPurchaseDate("");
    setIsUpdating(false);
    setIsDatePickerOpen(false);
  };

  useEffect(() => {
    if (item?.itemType === "album" && item.albumData) {
      setCoverState(item.albumData.state_cover || null);
      setDiscState(item.albumData.state_record || null);
      setPurchaseDate(item.albumData.acquisition_month_year || "");
    } else if (item?.itemType === "artist") {
      resetAlbumStates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id, item?.itemType]);

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
      ? { id: item.id, artist: item.artist, title: item.title }
      : undefined
  );

  const {
    data: artistMetadata,
    isLoading: isArtistLoading,
    error: artistError,
  } = useArtistMetadata(
    item?.itemType === "artist" && item.id && item.id.trim() !== ""
      ? item.id
      : undefined
  );

  const isLoading = item?.itemType === "album" ? isAlbumLoading : isArtistLoading;
  const error = item?.itemType === "album" ? albumError : artistError;
  const hasAtLeastOneField =
    discState !== null || coverState !== null || purchaseDate !== "";

  const handleUpdateAlbumStates = async () => {
    if (!item || item.itemType !== "album" || !collectionId || !item.internalId || !hasAtLeastOneField) {
      return;
    }

    setIsUpdating(true);
    try {
      await updateAlbumStatesMutation.mutateAsync({
        collectionId: parseInt(collectionId),
        albumId: parseInt(item.internalId),
        data: {
          state_record: discState,
          state_cover: coverState,
          acquisition_month_year: purchaseDate || null,
        },
      });
      setShowSuccessToast(true);
    } catch {
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

  if (!item) return null;

  return (
    <>
      <Modal
        open={isOpen}
        onClose={onClose}
        closeAfterTransition
        slots={{ backdrop: Backdrop }}
        disableAutoFocus
        disableEnforceFocus
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
                {item.itemType === "album" ? "Album details" : "Artist details"}
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
                  {(item.itemType === "album"
                    ? albumMetadata?.image_url
                    : item.image_url) && (
                    <img
                      src={buildProxyImageUrl(
                        (item.itemType === "album"
                          ? albumMetadata?.image_url
                          : item.image_url) || "",
                        240,
                        240,
                        85,
                        true
                      )}
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

                {item.itemType === "album" &&
                  albumMetadata?.genres &&
                  albumMetadata.genres.length > 0 && (
                    <Box mb={3}>
                      <Typography variant="subtitle1" sx={{ color: "#C9A726", mb: 1 }}>
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
                              "&:hover": { backgroundColor: "#b38f1f" },
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}

                {item.itemType === "album" &&
                  context === "collection" &&
                  (!isExplorePage || coverState || discState || purchaseDate) && (
                    <AlbumStateEditor
                      coverState={coverState}
                      discState={discState}
                      purchaseDate={purchaseDate}
                      isOwner={isOwner === true}
                      isUpdating={isUpdating}
                      hasAtLeastOneField={hasAtLeastOneField}
                      isDatePickerOpen={isDatePickerOpen}
                      onCoverChange={(v) => setCoverState((v as VinylStateEnum) || null)}
                      onDiscChange={(v) => setDiscState((v as VinylStateEnum) || null)}
                      onDateChange={(newValue) => {
                        setPurchaseDate(newValue ? format(newValue, "yyyy-MM") : "");
                        setIsDatePickerOpen(false);
                      }}
                      onDatePickerOpen={() => setIsDatePickerOpen(true)}
                      onDatePickerClose={() => setIsDatePickerOpen(false)}
                      onUpdate={() => { void handleUpdateAlbumStates(); }}
                    />
                  )}

                {item.itemType === "album" && albumMetadata?.tracklist && (
                  <TracklistAccordion tracklist={albumMetadata.tracklist} />
                )}

                {item.itemType === "artist" && artistMetadata?.biography && (
                  <Box mb={3}>
                    <Typography variant="subtitle1" sx={{ color: "#C9A726", mb: 1 }}>
                      Biography
                    </Typography>
                    <Box sx={{ p: 2, maxHeight: 200, overflow: "auto" }}>
                      <Typography
                        sx={{ color: "#fffbf9", whiteSpace: "pre-line", lineHeight: 1.6 }}
                      >
                        {artistMetadata.biography}
                      </Typography>
                    </Box>
                  </Box>
                )}

                {item.itemType === "artist" &&
                  artistMetadata?.genres &&
                  artistMetadata.genres.length > 0 && (
                    <Box mb={3}>
                      <Typography variant="subtitle1" sx={{ color: "#C9A726", mb: 1 }}>
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
                              "&:hover": { backgroundColor: "#b38f1f" },
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}

                <StreamingLinksAccordion
                  itemTitle={item.title}
                  itemArtist={item.artist}
                  itemType={item.itemType}
                />

                {(!albumMetadata?.tracklist && item.itemType === "album") ||
                (!artistMetadata?.biography && item.itemType === "artist") ? (
                  <Typography
                    variant="body2"
                    sx={{ color: "#e4e4e4", mt: 2, textAlign: "center" }}
                  >
                    {item.itemType === "album"
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
            "& .MuiAlert-icon": { color: "#1F1F1F" },
          }}
        >
          Album states updated successfully!
        </Alert>
      </Snackbar>
    </>
  );
}
