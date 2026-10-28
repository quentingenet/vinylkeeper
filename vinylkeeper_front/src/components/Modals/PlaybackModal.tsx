import {
  Modal,
  Box,
  Typography,
  Chip,
  Fade,
  Backdrop,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import {
  useAlbumMetadata,
  useArtistMetadata,
} from "@services/MusicMetadataService";
import useDetectMobile from "@hooks/useDetectMobile";
import { useParams } from "react-router-dom";
import { useAddRecord } from "@contexts/AddRecordContext";
import VinylSpinner from "@components/UI/VinylSpinner";
import { buildProxyImageUrl } from "@utils/ImageProxyHelper";
import StreamingLinksAccordion from "@components/Modals/StreamingLinksAccordion";
import TracklistAccordion from "@components/Modals/TracklistAccordion";
import PressingSection from "@components/Modals/PressingSection";
import CollectionPressings from "@components/Modals/CollectionPressings";
import OwnedPressingsSection from "@components/Modals/OwnedPressingsSection";
import type { CollectionAlbumResponse } from "@models/Collection";

export interface PlaybackItem {
  id: string;
  title: string;
  artist: string;
  image_url?: string;
  itemType: "album" | "artist";
  internalId?: string;
  // In a collection: every pressing of the work held there, first added first, with its copies
  pressings?: CollectionAlbumResponse[];
  // A record of the user's own collections (Spinning now): list the pressings they own of the work
  owned?: { masterId: string | null };
}

interface PlaybackModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: PlaybackItem | null;
  context?: "wishlist" | "collection";
  isOwner?: boolean;
  onRemovePressing?: (pressing: CollectionAlbumResponse) => void;
}

export default function PlaybackModal({
  isOpen,
  onClose,
  item,
  context,
  isOwner,
  onRemovePressing,
}: PlaybackModalProps) {
  const { isMobile } = useDetectMobile();
  const { id: collectionId } = useParams<{ id: string }>();
  const { openAddRecord } = useAddRecord();

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

  const handleFindPressing = (pressing: CollectionAlbumResponse) => {
    if (!collectionId) return;
    onClose();
    openAddRecord({
      initialQuery: pressing.title,
      replaceTarget: { collectionId: parseInt(collectionId), albumId: pressing.id, title: pressing.title },
    });
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
                sx={{ color: "primary.main", fontWeight: "bold" }}
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
                      sx={{ color: "primary.main", mb: 1 }}
                    >
                      {item.title}
                    </Typography>
                  </Box>
                </Box>

                {item.itemType === "album" && context === "collection" && collectionId && item.pressings?.length ? (
                  <CollectionPressings
                    // Fresh local state for every work opened
                    key={item.pressings.map((p) => p.id).join("-")}
                    collectionId={parseInt(collectionId)}
                    pressings={item.pressings}
                    canEdit={isOwner === true}
                    liveEdition={albumMetadata ?? undefined}
                    onFindPressing={handleFindPressing}
                    onRemovePressing={onRemovePressing}
                  />
                ) : item.itemType === "album" && item.owned ? (
                  <OwnedPressingsSection externalId={item.id} masterId={item.owned.masterId} />
                ) : item.itemType === "album" && albumMetadata ? (
                  <PressingSection edition={albumMetadata} />
                ) : null}

                {item.itemType === "album" &&
                  albumMetadata?.genres &&
                  albumMetadata.genres.length > 0 && (
                    <Box mb={3}>
                      <Typography variant="subtitle1" sx={{ color: "primary.main", mb: 1 }}>
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
                              backgroundColor: "primary.main",
                              color: "#fffbf9",
                              "&:hover": { backgroundColor: "#b38f1f" },
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}

                {item.itemType === "album" && albumMetadata?.tracklist && (
                  <TracklistAccordion tracklist={albumMetadata.tracklist} />
                )}

                {item.itemType === "artist" && artistMetadata?.biography && (
                  <Box mb={3}>
                    <Typography variant="subtitle1" sx={{ color: "primary.main", mb: 1 }}>
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
                      <Typography variant="subtitle1" sx={{ color: "primary.main", mb: 1 }}>
                        Genres
                      </Typography>
                      <Box display="flex" flexWrap="wrap" gap={1}>
                        {artistMetadata.genres.map((genre, index) => (
                          <Chip
                            key={index}
                            label={genre}
                            size="small"
                            sx={{
                              backgroundColor: "primary.main",
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

    </>
  );
}
