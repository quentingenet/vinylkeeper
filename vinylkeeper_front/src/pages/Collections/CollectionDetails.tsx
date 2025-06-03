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
  Chip,
} from "@mui/material";
import { useEffect, useState } from "react";
import useDetectMobile from "@hooks/useDetectMobile";
import { useUserContext } from "@contexts/UserContext";
import DeleteIcon from "@mui/icons-material/Delete";
import { zoomIn } from "@utils/Animations";
import VinylKeeperDialog from "@components/UI/VinylKeeperDialog";
import PlayButton from "@components/UI/PlayButton";
import PlaybackModal, { PlaybackItem } from "@components/Modals/PlaybackModal";

export default function CollectionDetails() {
  const { id } = useParams<{ id: string }>();
  const collectionId = id ? parseInt(id) : 0;
  const { isMobile } = useDetectMobile();
  const { currentUser } = useUserContext();
  const queryClient = useQueryClient();

  // États pour la modal de confirmation
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{
    id: number;
    name: string;
    type:
      | "local_album"
      | "external_album"
      | "local_artist"
      | "external_artist"
      | "local_genre";
  } | null>(null);

  // États pour le modal de lecture
  const [playbackModalOpen, setPlaybackModalOpen] = useState(false);
  const [selectedPlaybackItem, setSelectedPlaybackItem] =
    useState<PlaybackItem | null>(null);
  const [playbackItemType, setPlaybackItemType] = useState<"album" | "artist">(
    "album"
  );

  const {
    data: collectionDetails,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["collectionDetails", collectionId],
    queryFn: () => collectionApiService.getCollectionDetails(collectionId),
    enabled: !!collectionId,
  });

  // Mutations pour la suppression
  const removeAlbumMutation = useMutation({
    mutationFn: ({ albumId }: { albumId: number }) =>
      collectionApiService.removeAlbumFromCollection(collectionId, albumId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["collectionDetails", collectionId],
      });
    },
  });

  const removeArtistMutation = useMutation({
    mutationFn: ({ artistId }: { artistId: number }) =>
      collectionApiService.removeArtistFromCollection(collectionId, artistId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["collectionDetails", collectionId],
      });
    },
  });

  const removeGenreMutation = useMutation({
    mutationFn: ({ genreId }: { genreId: number }) =>
      collectionApiService.removeGenreFromCollection(collectionId, genreId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["collectionDetails", collectionId],
      });
    },
  });

  const removeExternalMutation = useMutation({
    mutationFn: ({ externalId }: { externalId: number }) =>
      collectionApiService.removeExternalItemFromCollection(
        collectionId,
        externalId
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["collectionDetails", collectionId],
      });
    },
  });

  // Fonctions pour ouvrir la modal de confirmation
  const openDeleteConfirmation = (item: {
    id: number;
    name: string;
    type:
      | "local_album"
      | "external_album"
      | "local_artist"
      | "external_artist"
      | "local_genre";
  }) => {
    setSelectedItem(item);
    setOpenDeleteDialog(true);
  };

  // Fonction de suppression finale après confirmation
  const handleConfirmDelete = () => {
    if (!selectedItem) return;

    switch (selectedItem.type) {
      case "local_album":
        removeAlbumMutation.mutate({ albumId: selectedItem.id });
        break;
      case "external_album":
      case "external_artist":
        removeExternalMutation.mutate({ externalId: selectedItem.id });
        break;
      case "local_artist":
        removeArtistMutation.mutate({ artistId: selectedItem.id });
        break;
      case "local_genre":
        removeGenreMutation.mutate({ genreId: selectedItem.id });
        break;
    }

    setOpenDeleteDialog(false);
    setSelectedItem(null);
  };

  // Fonctions pour gérer le modal de lecture
  const handlePlayClick = (item: any, type: "album" | "artist") => {
    let playbackItem: PlaybackItem;
    if (item.externalId) {
      playbackItem = {
        id: item.id,
        title: item.title || "Unknown Album",
        artist: item.artistName || "Unknown Artist",
        source: "deezer",
        deezerId: String(item.externalId),
        pictureMedium: item.pictureMedium || "",
        releaseYear: item.releaseYear,
      };
    } else {
      playbackItem = {
        id: item.id,
        title: item.title || item.name || "Unknown Album",
        artist: item.artist || item.artistName || "Unknown Artist",
        source: "musicbrainz",
        musicbrainzId: item.musicbrainzId ? String(item.musicbrainzId) : "",
        pictureMedium: item.pictureMedium || "",
        releaseYear: item.releaseYear,
      };
    }
    setSelectedPlaybackItem(playbackItem);
    setPlaybackItemType(type);
    setPlaybackModalOpen(true);
  };

  const handleClosePlaybackModal = () => {
    setPlaybackModalOpen(false);
    setSelectedPlaybackItem(null);
  };

  useEffect(() => {
    if (collectionDetails) {
      document.title = `${collectionDetails.collection.name} - VinylKeeper`;
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

  const {
    collection,
    localAlbums,
    localArtists,
    localGenres,
    externalAlbums,
    externalArtists,
  } = collectionDetails;

  const isOwner = currentUser && collection.user_id === currentUser.id;

  return (
    <Box sx={{ padding: 3 }}>
      {/* Collection Header */}
      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        sx={{ color: "#C9A726" }}
      >
        {collection.name}
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        {collection.description}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Created on {new Date(collection.registered_at).toLocaleDateString()}
      </Typography>

      {/* Albums Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ color: "#C9A726", mb: 2 }}>
          Albums ({localAlbums.length + externalAlbums.length})
        </Typography>

        {localAlbums.length + externalAlbums.length === 0 ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="100px"
          >
            <Typography variant="h6" sx={{ color: "#e4e4e4" }}>
              No albums in this collection
            </Typography>
          </Box>
        ) : (
          <Box
            display={isMobile ? "flex" : "grid"}
            flexDirection={isMobile ? "column" : "row"}
            flexWrap={isMobile ? "nowrap" : "wrap"}
            gridTemplateColumns={isMobile ? "repeat(1, 1fr)" : "repeat(3, 1fr)"}
            justifyContent={isMobile ? "center" : "flex-start"}
            alignItems={isMobile ? "center" : "flex-start"}
            gap={4}
            marginY={isMobile ? 1 : 3}
          >
            {/* Local Albums */}
            {localAlbums.map((album) => (
              <Card
                key={`local-album-${album.id}`}
                sx={{
                  backgroundColor: "#3f3f41",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  width: 250,
                  borderRadius: "8px",
                }}
              >
                <Box
                  display={"flex"}
                  flexDirection={"column"}
                  alignItems={"flex-end"}
                >
                  <PlayButton
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayClick(album, "album");
                    }}
                    position={{ top: 10, right: 10 }}
                  />
                  {isOwner && (
                    <Box
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteConfirmation({
                          id: album.id,
                          name: album.title,
                          type: "local_album",
                        });
                      }}
                      sx={{
                        position: "absolute",
                        cursor: "pointer",
                        backgroundColor: "#1F1F1F",
                        borderRadius: "50%",
                        padding: 1,
                        top: 50,
                        right: 10,
                        opacity: 0.9,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        "&:hover": {
                          animation: `${zoomIn} 0.3s ease-in-out`,
                        },
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </Box>
                  )}
                </Box>
                <Box
                  sx={{
                    width: "100%",
                    height: 250,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#2a2a2a",
                  }}
                >
                  <Typography variant="h1" sx={{ color: "#C9A726" }}>
                    ♪
                  </Typography>
                </Box>
                <CardContent
                  sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    textAlign: "center",
                    height: "100px",
                    padding: "16px",
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{
                      color: "#C9A726",
                      marginBottom: "4px",
                      fontWeight: "bold",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      width: "100%",
                    }}
                  >
                    {album.artist}
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      color: "#fffbf9",
                      marginBottom: "8px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      width: "100%",
                    }}
                  >
                    {album.title}
                  </Typography>
                </CardContent>
              </Card>
            ))}

            {/* External Albums (Deezer) */}
            {externalAlbums.map((album) => (
              <Card
                key={`external-album-${album.id}`}
                sx={{
                  backgroundColor: "#3f3f41",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  width: 250,
                  borderRadius: "8px",
                }}
              >
                <Box
                  display={"flex"}
                  flexDirection={"column"}
                  alignItems={"flex-end"}
                >
                  <PlayButton
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayClick(album, "album");
                    }}
                    position={{ top: 10, right: 10 }}
                  />
                  {isOwner && (
                    <Box
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteConfirmation({
                          id: album.id,
                          name: album.title,
                          type: "external_album",
                        });
                      }}
                      sx={{
                        position: "absolute",
                        cursor: "pointer",
                        backgroundColor: "#1F1F1F",
                        borderRadius: "50%",
                        padding: 1,
                        top: 50,
                        right: 10,
                        opacity: 0.9,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        "&:hover": {
                          animation: `${zoomIn} 0.3s ease-in-out`,
                        },
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </Box>
                  )}
                </Box>
                <Box
                  sx={{
                    width: "100%",
                    height: 250,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <img
                    src={album.pictureMedium || "/default-album.png"}
                    alt={album.title}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </Box>
                <CardContent
                  sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    textAlign: "center",
                    height: "100px",
                    padding: "16px",
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{
                      color: "#C9A726",
                      marginBottom: "4px",
                      fontWeight: "bold",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      width: "100%",
                    }}
                  >
                    {album.artistName || "Unknown Artist"}
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      color: "#fffbf9",
                      marginBottom: "8px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      width: "100%",
                    }}
                  >
                    {album.title}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Box>

      {/* Artists Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ color: "#C9A726", mb: 2 }}>
          Artists ({localArtists.length + externalArtists.length})
        </Typography>

        {localArtists.length + externalArtists.length === 0 ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="100px"
          >
            <Typography variant="h6" sx={{ color: "#e4e4e4" }}>
              No artists in this collection
            </Typography>
          </Box>
        ) : (
          <Box
            display={isMobile ? "flex" : "grid"}
            flexDirection={isMobile ? "column" : "row"}
            flexWrap={isMobile ? "nowrap" : "wrap"}
            gridTemplateColumns={isMobile ? "repeat(1, 1fr)" : "repeat(3, 1fr)"}
            justifyContent={isMobile ? "center" : "flex-start"}
            alignItems={isMobile ? "center" : "flex-start"}
            gap={4}
            marginY={isMobile ? 1 : 3}
          >
            {/* Local Artists */}
            {localArtists.map((artist) => (
              <Card
                key={`local-artist-${artist.id}`}
                sx={{
                  backgroundColor: "#3f3f41",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  width: 250,
                  borderRadius: "8px",
                }}
              >
                <Box
                  display={"flex"}
                  flexDirection={"column"}
                  alignItems={"flex-end"}
                >
                  <PlayButton
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayClick(artist, "artist");
                    }}
                    position={{ top: 10, right: 10 }}
                  />
                  {isOwner && (
                    <Box
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteConfirmation({
                          id: artist.id,
                          name: artist.name,
                          type: "local_artist",
                        });
                      }}
                      sx={{
                        position: "absolute",
                        cursor: "pointer",
                        backgroundColor: "#1F1F1F",
                        borderRadius: "50%",
                        padding: 1,
                        top: 50,
                        right: 10,
                        opacity: 0.9,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        "&:hover": {
                          animation: `${zoomIn} 0.3s ease-in-out`,
                        },
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </Box>
                  )}
                </Box>
                <Box
                  sx={{
                    width: "100%",
                    height: 250,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#2a2a2a",
                  }}
                >
                  <Typography variant="h1" sx={{ color: "#C9A726" }}>
                    ♫
                  </Typography>
                </Box>
                <CardContent
                  sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    textAlign: "center",
                    height: "100px",
                    padding: "16px",
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{
                      color: "#C9A726",
                      marginBottom: "8px",
                      fontWeight: "bold",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      width: "100%",
                    }}
                  >
                    {artist.name}
                  </Typography>
                </CardContent>
              </Card>
            ))}

            {/* External Artists (Deezer) */}
            {externalArtists.map((artist) => (
              <Card
                key={`external-artist-${artist.id}`}
                sx={{
                  backgroundColor: "#3f3f41",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  width: 250,
                  borderRadius: "8px",
                }}
              >
                <Box
                  display={"flex"}
                  flexDirection={"column"}
                  alignItems={"flex-end"}
                >
                  <PlayButton
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayClick(artist, "artist");
                    }}
                    position={{ top: 10, right: 10 }}
                  />
                  {isOwner && (
                    <Box
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteConfirmation({
                          id: artist.id,
                          name: artist.title,
                          type: "external_artist",
                        });
                      }}
                      sx={{
                        position: "absolute",
                        cursor: "pointer",
                        backgroundColor: "#1F1F1F",
                        borderRadius: "50%",
                        padding: 1,
                        top: 50,
                        right: 10,
                        opacity: 0.9,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        "&:hover": {
                          animation: `${zoomIn} 0.3s ease-in-out`,
                        },
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </Box>
                  )}
                </Box>
                <Box
                  sx={{
                    width: "100%",
                    height: 250,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <img
                    src={artist.pictureMedium || "/default-artist.png"}
                    alt={artist.title}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      target.parentElement!.innerHTML =
                        '<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background-color: #2a2a2a; color: #C9A726; font-size: 24px;">♫</div>';
                    }}
                  />
                </Box>
                <CardContent
                  sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    textAlign: "center",
                    height: "100px",
                    padding: "16px",
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{
                      color: "#C9A726",
                      marginBottom: "8px",
                      fontWeight: "bold",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      width: "100%",
                    }}
                  >
                    {artist.title}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Box>

      {/* Genres Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ color: "#C9A726", mb: 2 }}>
          Genres ({localGenres.length})
        </Typography>
        {localGenres.length === 0 ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="100px"
          >
            <Typography variant="h6" sx={{ color: "#e4e4e4" }}>
              No genres in this collection
            </Typography>
          </Box>
        ) : (
          <Box display="flex" flexWrap="wrap" gap={1}>
            {localGenres.map((genre) => (
              <Chip
                key={`genre-${genre.id}`}
                label={genre.name}
                sx={{
                  backgroundColor: "#C9A726",
                  color: "#000",
                  fontWeight: "bold",
                }}
                onDelete={
                  isOwner
                    ? () => {
                        openDeleteConfirmation({
                          id: genre.id,
                          name: genre.name,
                          type: "local_genre",
                        });
                      }
                    : undefined
                }
                deleteIcon={
                  isOwner ? (
                    <DeleteIcon sx={{ color: "#000 !important" }} />
                  ) : undefined
                }
              />
            ))}
          </Box>
        )}
      </Box>

      {/* Modal de confirmation de suppression */}
      <VinylKeeperDialog
        title="Remove from collection"
        content={
          selectedItem
            ? `Are you sure you want to remove "${selectedItem.name}" from this collection?`
            : "Are you sure you want to remove this item from the collection?"
        }
        onConfirm={handleConfirmDelete}
        textConfirm="Remove"
        textCancel="Cancel"
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
      />

      {/* Modal de lecture */}
      <PlaybackModal
        isOpen={playbackModalOpen}
        onClose={handleClosePlaybackModal}
        item={selectedPlaybackItem}
        itemType={playbackItemType}
      />
    </Box>
  );
}
