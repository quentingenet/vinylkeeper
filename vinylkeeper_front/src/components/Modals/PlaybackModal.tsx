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
  source: "deezer" | "musicbrainz";
  deezerId?: string;
  musicbrainzId?: string;
  pictureMedium?: string;
  releaseYear?: number;
}

interface PlaybackModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: PlaybackItem | null;
  itemType: "album" | "artist";
}

export default function PlaybackModal({
  isOpen,
  onClose,
  item,
  itemType,
}: PlaybackModalProps) {
  const { isMobile } = useDetectMobile();
  const albumId =
    item?.deezerId || item?.musicbrainzId || item?.id?.toString() || "unknown";
  const { data: albumMetadata, isLoading: albumLoading } = useAlbumMetadata(
    item
      ? {
          id: albumId,
          source: item.source,
          artist: item.artist,
          title: item.title,
        }
      : { id: "unknown", source: "deezer", artist: "", title: "" }
  );
  const artistId =
    itemType === "artist" ? item?.deezerId?.toString() || "unknown" : undefined;
  const { data: artistMetadata, isLoading: artistLoading } = useArtistMetadata(
    artistId,
    item?.title || ""
  );
  const loading = itemType === "album" ? albumLoading : artistLoading;
  if (!item) return null;

  const handleStreamingRedirect = (platformName: string) => {
    if (!item) return;

    const query: StreamingQuery = {};

    if (itemType === "album") {
      query.artist = item.artist || item.title;
      query.album = item.title;
    } else {
      query.artist = item.title;
    }

    musicStreamingService.redirectTo(platformName, query);
  };

  const modalStyle = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: isMobile ? "90%" : "500px",
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
            <Typography variant="h6" component="h2" sx={{ color: "#C9A726" }}>
              {itemType === "album" ? "Album Details" : "Artist Details"}
            </Typography>
            <IconButton onClick={onClose} size="small">
              <CloseIcon sx={{ color: "#fffbf9" }} />
            </IconButton>
          </Box>

          {loading ? (
            <Box display="flex" justifyContent="center" my={4}>
              <CircularProgress sx={{ color: "#C9A726" }} />
            </Box>
          ) : (
            <>
              <Box display="flex" alignItems="center" mb={3}>
                {item.pictureMedium && (
                  <img
                    src={item.pictureMedium}
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
                  {itemType === "album" && (
                    <Typography
                      variant="body1"
                      sx={{ color: "#fffbf9", mb: 1 }}
                    >
                      {item.artist}
                    </Typography>
                  )}
                  {(albumMetadata?.releaseYear || item.releaseYear) && (
                    <Typography variant="body2" sx={{ color: "#e4e4e4" }}>
                      {albumMetadata?.releaseYear || item.releaseYear}
                    </Typography>
                  )}
                </Box>
              </Box>

              {itemType === "album" && albumMetadata?.tracklist && (
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
                              {track.position}. {track.title}
                            </Typography>
                          }
                          secondary={
                            track.duration && (
                              <Typography sx={{ color: "#e4e4e4" }}>
                                {track.duration}
                              </Typography>
                            )
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </>
              )}

              {itemType === "artist" && artistMetadata && (
                <>
                  {artistMetadata.biography && (
                    <>
                      <Typography
                        variant="subtitle1"
                        sx={{ color: "#C9A726", mb: 1 }}
                      >
                        Biography
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: "#fffbf9", mb: 2 }}
                      >
                        {artistMetadata.biography}
                      </Typography>
                      {artistMetadata.wikipedia_url && (
                        <a
                          href={artistMetadata.wikipedia_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "#C9A726",
                            textDecoration: "underline",
                            display: "inline-block",
                            marginTop: 8,
                          }}
                        >
                          En savoir +
                        </a>
                      )}
                    </>
                  )}

                  {artistMetadata.genres &&
                    artistMetadata.genres.length > 0 && (
                      <>
                        <Typography
                          variant="subtitle1"
                          sx={{ color: "#C9A726", mb: 1 }}
                        >
                          Genres
                        </Typography>
                        <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
                          {artistMetadata.genres
                            .slice(0, 5)
                            .map((genre, index) => (
                              <Chip
                                key={index}
                                label={genre}
                                size="small"
                                sx={{
                                  backgroundColor: "#1F1F1F",
                                  color: "#C9A726",
                                }}
                              />
                            ))}
                        </Box>
                      </>
                    )}
                </>
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
                    onClick={() => handleStreamingRedirect(platform.name)}
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

              {(!albumMetadata?.tracklist && itemType === "album") ||
              (!artistMetadata?.biography && itemType === "artist") ? (
                <Typography
                  variant="body2"
                  sx={{ color: "#e4e4e4", mt: 2, textAlign: "center" }}
                >
                  {itemType === "album"
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
