import React from "react";
import {
  Modal,
  Box,
  Typography,
  Button,
  Divider,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Chip,
  Fade,
  Backdrop,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import {
  musicStreamingService,
  StreamingQuery,
} from "@services/MusicStreamingService";
import {
  useAlbumMetadata,
  useArtistMetadata,
} from "@services/MusicMetadataService";
import useDetectMobile from "@hooks/useDetectMobile";

export interface PlaybackItem {
  id: string | number;
  title: string;
  artist: string;
  image_url?: string;
  itemType: "album" | "artist";
}

interface PlaybackModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: PlaybackItem | null;
}

export default function PlaybackModal({
  isOpen,
  onClose,
  item,
}: PlaybackModalProps) {
  const { isMobile } = useDetectMobile();

  const {
    data: albumMetadata,
    isLoading: isAlbumLoading,
    error: albumError,
  } = useAlbumMetadata(
    item?.itemType === "album"
      ? {
          id: item.id.toString(),
          artist: item.artist,
          title: item.title,
        }
      : undefined
  );

  const {
    data: artistMetadata,
    isLoading: isArtistLoading,
    error: artistError,
  } = useArtistMetadata(
    item?.itemType === "artist" ? item.id.toString() : undefined
  );

  const metadata = item?.itemType === "album" ? albumMetadata : artistMetadata;
  const isLoading =
    item?.itemType === "album" ? isAlbumLoading : isArtistLoading;
  const error = item?.itemType === "album" ? albumError : artistError;

  const loading = item?.itemType === "album" ? !albumMetadata : !artistMetadata;
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
        url = isMobile
          ? `spotify:search:${queryParts.join(" ")}`
          : `${import.meta.env.VITE_SPOTIFY_WEB_URL}/${searchQuery}`;
        break;

      case "deezer":
        url = isMobile
          ? `deezer://search/${searchQuery}`
          : `${import.meta.env.VITE_DEEZER_WEB_URL}/${searchQuery}`;
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
              {item?.itemType === "album" ? "Album Details" : "Artist Details"}
            </Typography>
            <IconButton onClick={onClose} size="small">
              <CloseIcon sx={{ color: "#fffbf9" }} />
            </IconButton>
          </Box>

          {isLoading ? (
            <Box display="flex" justifyContent="center" my={4}>
              <CircularProgress sx={{ color: "#C9A726" }} />
            </Box>
          ) : error ? (
            <Box display="flex" justifyContent="center" my={4}>
              <Typography sx={{ color: "#e4e4e4" }}>
                {error instanceof Error
                  ? error.message
                  : "Une erreur est survenue"}
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

              {item?.itemType === "album" && albumMetadata?.tracklist && (
                <>
                  <Typography
                    variant="subtitle1"
                    sx={{ color: "#C9A726", mb: 2 }}
                  >
                    Tracklist
                  </Typography>
                  <List sx={{ mb: 3, maxHeight: 200, overflow: "auto" }}>
                    {albumMetadata.tracklist.map((track, index) => (
                      <ListItem key={index} sx={{ py: 0.5 }}>
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
                </>
              )}

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

              <Divider sx={{ my: 3, backgroundColor: "#e4e4e4" }} />

              <Typography variant="subtitle1" sx={{ color: "#C9A726", mb: 2 }}>
                Listen on
              </Typography>

              <Box display="flex" flexDirection="column" gap={2}>
                {musicStreamingService.getPlatforms().map((platform) => (
                  <Button
                    key={platform.name}
                    variant="contained"
                    fullWidth
                    onClick={() =>
                      handleStreamingRedirect(platform.name, item?.itemType)
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
  );
}
