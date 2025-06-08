import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  collectionApiService,
  type CollectionDetails,
} from "@services/CollectionApiService";
import {
  Typography,
  Box,
  CircularProgress,
  Card,
  CardContent,
  CardMedia,
  IconButton,
} from "@mui/material";
import { useEffect, useState } from "react";
import useDetectMobile from "@hooks/useDetectMobile";
import { useUserContext } from "@contexts/UserContext";
import { zoomIn } from "@utils/Animations";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PlaybackModal, { PlaybackItem } from "@components/Modals/PlaybackModal";
import { Album } from "@mui/icons-material";
import { truncateText } from "@utils/GlobalUtils";
import styles from "../../styles/pages/AddVinyls.module.scss";

export default function CollectionDetails() {
  const { id } = useParams<{ id: string }>();
  const collectionId = id ? parseInt(id) : 0;
  const { isMobile } = useDetectMobile();
  const { currentUser, isUserLoggedIn } = useUserContext();
  const queryClient = useQueryClient();
  const [playbackModalOpen, setPlaybackModalOpen] = useState(false);
  const [selectedPlaybackItem, setSelectedPlaybackItem] =
    useState<PlaybackItem | null>(null);

  const {
    data: collectionDetails,
    isLoading,
    error,
  } = useQuery<CollectionDetails>({
    queryKey: ["collectionDetails", collectionId],
    queryFn: () => collectionApiService.getCollectionDetails(collectionId),
    enabled: !!collectionId,
  });

  const removeAlbumMutation = useMutation({
    mutationFn: (albumId: number) =>
      collectionApiService.removeAlbumFromCollection(collectionId, albumId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["collectionDetails", collectionId],
      });
    },
  });

  const removeArtistMutation = useMutation({
    mutationFn: (artistId: number) =>
      collectionApiService.removeArtistFromCollection(collectionId, artistId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["collectionDetails", collectionId],
      });
    },
  });

  const handleOpenModalCollection = (isOpen: boolean, collection: any) => {
    // TODO: Implement collection edit modal
    console.log("Open edit modal for collection:", collection);
  };

  const handlePlayClick = (item: any, type: "album" | "artist") => {
    const playbackItem: PlaybackItem = {
      id:
        type === "album"
          ? (item.external_album_id || item.id).toString()
          : (item.external_artist_id || item.id).toString(),
      title: item.title || item.name,
      artist: type === "album" ? item.artist_name || "" : "",
      image_url: item.image_url || "",
      itemType: type,
    };
    setSelectedPlaybackItem(playbackItem);
    setPlaybackModalOpen(true);
  };

  const handleClosePlaybackModal = () => {
    setPlaybackModalOpen(false);
    setSelectedPlaybackItem(null);
  };

  useEffect(() => {
    if (collectionDetails?.name) {
      document.title = `${collectionDetails.name} - VinylKeeper`;
    }
    return () => {
      document.title = "VinylKeeper";
    };
  }, [collectionDetails]);

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="200px"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error || !collectionDetails) {
    return (
      <Box>
        <Typography variant="h6" color="error">
          Collection not found
        </Typography>
      </Box>
    );
  }

  const allAlbums = collectionDetails.albums || [];
  const allArtists = collectionDetails.artists || [];

  const isOwner =
    isUserLoggedIn &&
    currentUser?.user_uuid === collectionDetails?.owner?.user_uuid;

  return (
    <Box sx={{ padding: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          sx={{ color: "#C9A726" }}
        >
          {collectionDetails.name || "Collection"}
        </Typography>
      </Box>
      <Typography variant="body1" color="text.secondary" paragraph>
        {collectionDetails.description || "No description available"}
      </Typography>
      <Box sx={{ mb: 4 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Created on{" "}
          {collectionDetails.registered_at
            ? new Date(collectionDetails.registered_at).toLocaleDateString()
            : "Unknown date"}
          {collectionDetails.owner && ` by ${collectionDetails.owner.username}`}
        </Typography>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ color: "#C9A726", mb: 2 }}>
          Albums ({allAlbums.length})
        </Typography>
        {allAlbums.length === 0 ? (
          <Typography variant="body1" color="text.secondary">
            No albums in this collection yet.
          </Typography>
        ) : (
          <div className={styles.resultsContainer}>
            {allAlbums.map((album) => (
              <Card
                onClick={() => handlePlayClick(album, "album")}
                key={album.id}
                className={styles.resultCard}
                sx={{
                  width: 250,
                  height: 350,
                  borderRadius: "8px",
                  cursor: "pointer",
                  position: "relative",
                  transition: "transform 0.2s ease-in-out",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    display: "flex",
                    flexDirection: "row",
                    gap: 1,
                    zIndex: 2,
                  }}
                >
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayClick(album, "album");
                    }}
                    sx={{
                      backgroundColor: "rgba(0, 0, 0, 0.5)",
                      width: "32px",
                      height: "32px",
                      p: 0,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      "&:hover": {
                        backgroundColor: "rgba(0, 0, 0, 0.7)",
                      },
                    }}
                  >
                    <PlayArrowIcon sx={{ color: "white", fontSize: "20px" }} />
                  </IconButton>
                  {isOwner && (
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        removeAlbumMutation.mutate(album.id);
                      }}
                      sx={{
                        backgroundColor: "rgba(0, 0, 0, 0.5)",
                        width: "32px",
                        height: "32px",
                        p: 0,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        "&:hover": {
                          backgroundColor: "rgba(0, 0, 0, 0.7)",
                        },
                      }}
                    >
                      <DeleteIcon sx={{ color: "white", fontSize: "20px" }} />
                    </IconButton>
                  )}
                </Box>
                {album.image_url ? (
                  <CardMedia
                    component="img"
                    height={250}
                    sx={{ objectFit: "contain" }}
                    image={album.image_url}
                    alt={album.title}
                  />
                ) : (
                  <Box
                    sx={{
                      height: 250,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Album
                      sx={{
                        opacity: 0.7,
                        width: 150,
                        height: 150,
                        color: "#C9A726",
                      }}
                    />
                  </Box>
                )}
                <CardContent
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "60px",
                    gap: 0.5,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "1.4rem",
                      textAlign: "center",
                      color: "#C9A726",
                      fontWeight: "bold",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      lineHeight: 1.2,
                      height: "2.4em",
                      width: "100%",
                    }}
                  >
                    {truncateText(album.title?.split(" - ")[0] || "", 20)}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "1rem",
                      textAlign: "center",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      lineHeight: 1.2,
                      height: "2.4em",
                      width: "100%",
                    }}
                    variant="h6"
                  >
                    {truncateText(
                      album.title?.split(" - ")[1] || album.title || "",
                      20
                    )}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ color: "#C9A726", mb: 2 }}>
          Artists ({allArtists.length})
        </Typography>
        {allArtists.length === 0 ? (
          <Typography variant="body1" color="text.secondary">
            No artists in this collection yet.
          </Typography>
        ) : (
          <div className={styles.resultsContainer}>
            {allArtists.map((artist) => (
              <Card
                onClick={() => handlePlayClick(artist, "artist")}
                key={artist.id}
                className={styles.resultCard}
                sx={{
                  width: 250,
                  height: 350,
                  borderRadius: "8px",
                  cursor: "pointer",
                  position: "relative",
                  transition: "transform 0.2s ease-in-out",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    display: "flex",
                    flexDirection: "row",
                    gap: 1,
                    zIndex: 2,
                  }}
                >
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayClick(artist, "artist");
                    }}
                    sx={{
                      backgroundColor: "rgba(0, 0, 0, 0.5)",
                      width: "32px",
                      height: "32px",
                      p: 0,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      "&:hover": {
                        backgroundColor: "rgba(0, 0, 0, 0.7)",
                      },
                    }}
                  >
                    <PlayArrowIcon sx={{ color: "white", fontSize: "20px" }} />
                  </IconButton>
                  {isOwner && (
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        removeArtistMutation.mutate(artist.id);
                      }}
                      sx={{
                        backgroundColor: "rgba(0, 0, 0, 0.5)",
                        width: "32px",
                        height: "32px",
                        p: 0,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        "&:hover": {
                          backgroundColor: "rgba(0, 0, 0, 0.7)",
                        },
                      }}
                    >
                      <DeleteIcon sx={{ color: "white", fontSize: "20px" }} />
                    </IconButton>
                  )}
                </Box>
                {artist.image_url ? (
                  <CardMedia
                    component="img"
                    height={250}
                    sx={{ objectFit: "contain" }}
                    image={artist.image_url}
                    alt={artist.title || artist.name}
                  />
                ) : (
                  <Box
                    sx={{
                      height: 250,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Album
                      sx={{
                        opacity: 0.7,
                        width: 150,
                        height: 150,
                        color: "#C9A726",
                      }}
                    />
                  </Box>
                )}
                <CardContent
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "60px",
                    gap: 0.5,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "1.4rem",
                      textAlign: "center",
                      color: "#C9A726",
                      fontWeight: "bold",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      lineHeight: 1.2,
                      height: "2.4em",
                      width: "100%",
                    }}
                  >
                    {truncateText(artist.title || artist.name || "", 20)}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </Box>

      <PlaybackModal
        isOpen={playbackModalOpen}
        onClose={handleClosePlaybackModal}
        item={selectedPlaybackItem}
      />
    </Box>
  );
}
