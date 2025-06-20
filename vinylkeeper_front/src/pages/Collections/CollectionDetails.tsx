import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  collectionApiService,
  type CollectionDetailResponse,
  type PaginatedAlbumsResponse,
  type PaginatedArtistsResponse,
} from "@services/CollectionApiService";
import {
  Typography,
  Box,
  CircularProgress,
  Card,
  CardContent,
  CardMedia,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tabs,
  Tab,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from "@mui/material";
import { useEffect, useState } from "react";
import useDetectMobile from "@hooks/useDetectMobile";
import { useUserContext } from "@contexts/UserContext";
import DeleteIcon from "@mui/icons-material/Delete";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PlaybackModal, { PlaybackItem } from "@components/Modals/PlaybackModal";
import { Album } from "@mui/icons-material";
import { truncateText } from "@utils/GlobalUtils";
import styles from "../../styles/pages/Collection.module.scss";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`collection-tabpanel-${index}`}
      aria-labelledby={`collection-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

type SortOrder = "newest" | "oldest";

export default function CollectionDetails() {
  const { id } = useParams<{ id: string }>();
  const collectionId = id ? parseInt(id) : 0;
  const { isMobile } = useDetectMobile();
  const { currentUser, isUserLoggedIn } = useUserContext();
  const queryClient = useQueryClient();

  // Tab state
  const [tabValue, setTabValue] = useState(0);

  // Sort order state
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");

  // Pagination states
  const [albumsPage, setAlbumsPage] = useState(1);
  const [artistsPage, setArtistsPage] = useState(1);
  const limit = 8;

  // Modal states
  const [playbackModalOpen, setPlaybackModalOpen] = useState(false);
  const [selectedPlaybackItem, setSelectedPlaybackItem] =
    useState<PlaybackItem | null>(null);
  const [deleteAlbumModalOpen, setDeleteAlbumModalOpen] = useState(false);
  const [deleteArtistModalOpen, setDeleteArtistModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{
    id: number;
    type: "album" | "artist";
    title: string;
  } | null>(null);

  // Collection details query
  const {
    data: collectionDetails,
    isLoading: isLoadingDetails,
    error: detailsError,
  } = useQuery<CollectionDetailResponse>({
    queryKey: ["collectionDetails", collectionId],
    queryFn: () => collectionApiService.getCollectionDetails(collectionId),
    enabled: !!collectionId,
  });

  // Albums paginated query
  const {
    data: albumsData,
    isLoading: isLoadingAlbums,
    error: albumsError,
  } = useQuery<PaginatedAlbumsResponse>({
    queryKey: ["collectionAlbums", collectionId, albumsPage],
    queryFn: () =>
      collectionApiService.getCollectionAlbumsPaginated(
        collectionId,
        albumsPage,
        limit
      ),
    enabled: !!collectionId && tabValue === 0,
  });

  // Artists paginated query
  const {
    data: artistsData,
    isLoading: isLoadingArtists,
    error: artistsError,
  } = useQuery<PaginatedArtistsResponse>({
    queryKey: ["collectionArtists", collectionId, artistsPage],
    queryFn: () =>
      collectionApiService.getCollectionArtistsPaginated(
        collectionId,
        artistsPage,
        limit
      ),
    enabled: !!collectionId && tabValue === 1,
  });

  const removeAlbumMutation = useMutation({
    mutationFn: (albumId: number) =>
      collectionApiService.removeAlbumFromCollection(collectionId, albumId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["collectionDetails", collectionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["collectionAlbums", collectionId],
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
      queryClient.invalidateQueries({
        queryKey: ["collectionArtists", collectionId],
      });
    },
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSortOrderChange = (event: SelectChangeEvent<SortOrder>) => {
    setSortOrder(event.target.value as SortOrder);
  };

  // Function to sort albums by date
  const getSortedAlbums = (albums: any[]) => {
    if (!albums) return [];

    const sorted = [...albums].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    return sorted;
  };

  // Function to sort artists by date
  const getSortedArtists = (artists: any[]) => {
    if (!artists) return [];

    const sorted = [...artists].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    return sorted;
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

  const handleDeleteAlbum = (album: any) => {
    setItemToDelete({ id: album.id, type: "album", title: album.title });
    setDeleteAlbumModalOpen(true);
  };

  const handleDeleteArtist = (artist: any) => {
    setItemToDelete({ id: artist.id, type: "artist", title: artist.title });
    setDeleteArtistModalOpen(true);
  };

  const confirmDeleteAlbum = () => {
    if (itemToDelete && itemToDelete.type === "album") {
      removeAlbumMutation.mutate(itemToDelete.id);
      setDeleteAlbumModalOpen(false);
      setItemToDelete(null);
    }
  };

  const confirmDeleteArtist = () => {
    if (itemToDelete && itemToDelete.type === "artist") {
      removeArtistMutation.mutate(itemToDelete.id);
      setDeleteArtistModalOpen(false);
      setItemToDelete(null);
    }
  };

  const closeDeleteModals = () => {
    setDeleteAlbumModalOpen(false);
    setDeleteArtistModalOpen(false);
    setItemToDelete(null);
  };

  useEffect(() => {
    if (collectionDetails?.name) {
      document.title = `${collectionDetails.name} - VinylKeeper`;
    }
    return () => {
      document.title = "VinylKeeper";
    };
  }, [collectionDetails]);

  if (isLoadingDetails) {
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

  if (detailsError || !collectionDetails) {
    return (
      <Box>
        <Typography variant="h6" color="error">
          Collection not found
        </Typography>
      </Box>
    );
  }

  const isOwner =
    isUserLoggedIn &&
    currentUser?.user_uuid === collectionDetails?.owner?.user_uuid;

  return (
    <Box
      sx={{
        padding: 3,
        maxWidth: isMobile ? "100%" : "1500px",
        minWidth: isMobile ? "100%" : "1200px",
        margin: isMobile ? "0" : "0 auto",
        width: "100%",
      }}
    >
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="flex-start"
        alignItems="flex-start"
      >
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
        <Box sx={{ mb: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Created on{" "}
            {collectionDetails.created_at
              ? new Date(collectionDetails.created_at).toLocaleDateString()
              : "Unknown date"}
            {collectionDetails.owner &&
              ` by ${collectionDetails.owner.username}`}
          </Typography>
        </Box>

        {/* Sort order dropdown */}
        <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end" }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel sx={{ color: "text.secondary" }}>Sort Order</InputLabel>
            <Select
              value={sortOrder}
              label="Sort Order"
              onChange={handleSortOrderChange}
              sx={{
                color: "text.primary",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(255, 255, 255, 0.3)",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(255, 255, 255, 0.5)",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#C9A726",
                },
                "& .MuiSvgIcon-root": {
                  color: "text.secondary",
                },
              }}
            >
              <MenuItem value="newest">Newest first</MenuItem>
              <MenuItem value="oldest">Oldest first</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      <Box sx={{ width: "100%", borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="collection tabs"
          variant="fullWidth"
          sx={{
            "& .MuiTab-root": {
              color: "#C9A726",
              "&.Mui-selected": { color: "#C9A726" },
            },
            "& .MuiTabs-indicator": { backgroundColor: "#C9A726" },
          }}
        >
          <Tab label="Albums" />
          <Tab label="Artists" />
        </Tabs>
      </Box>

      {/* Contenu normal */}
      <Box sx={{ mt: 3 }}>
        <TabPanel value={tabValue} index={0}>
          {isLoadingAlbums ? (
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              minHeight="200px"
            >
              <CircularProgress />
            </Box>
          ) : albumsError ? (
            <Typography variant="h6" color="error">
              Error loading albums
            </Typography>
          ) : albumsData?.items.length === 0 ? (
            <Typography variant="body1" color="text.secondary">
              No albums in this collection yet.
            </Typography>
          ) : (
            <>
              <div className={styles.resultsContainer}>
                {getSortedAlbums(albumsData?.items || []).map((album) => (
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
                        <PlayArrowIcon
                          sx={{ color: "white", fontSize: "20px" }}
                        />
                      </IconButton>
                      {isOwner && (
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAlbum(album);
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
                          <DeleteIcon
                            sx={{ color: "white", fontSize: "20px" }}
                          />
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
                        height: "80px",
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
              {albumsData && albumsData.total_pages > 1 && (
                <Box display="flex" justifyContent="center" mt={3}>
                  <Pagination
                    count={albumsData.total_pages}
                    page={albumsPage}
                    onChange={(_event, page) => setAlbumsPage(page)}
                    color="primary"
                    sx={{
                      "& .MuiPaginationItem-root": {
                        color: "#C9A726",
                      },
                      "& .MuiPaginationItem-root.Mui-selected": {
                        backgroundColor: "#C9A726",
                        color: "white",
                      },
                    }}
                  />
                </Box>
              )}
            </>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {isLoadingArtists ? (
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              minHeight="200px"
            >
              <CircularProgress />
            </Box>
          ) : artistsError ? (
            <Typography variant="h6" color="error">
              Error loading artists
            </Typography>
          ) : artistsData?.items.length === 0 ? (
            <Typography variant="body1" color="text.secondary">
              No artists in this collection yet.
            </Typography>
          ) : (
            <>
              <div className={styles.resultsContainer}>
                {getSortedArtists(artistsData?.items || []).map((artist) => (
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
                        <PlayArrowIcon
                          sx={{ color: "white", fontSize: "20px" }}
                        />
                      </IconButton>
                      {isOwner && (
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteArtist(artist);
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
                          <DeleteIcon
                            sx={{ color: "white", fontSize: "20px" }}
                          />
                        </IconButton>
                      )}
                    </Box>
                    {artist.image_url ? (
                      <CardMedia
                        component="img"
                        height={250}
                        sx={{ objectFit: "contain" }}
                        image={artist.image_url}
                        alt={artist.title}
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
                        height: "80px",
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
                        {truncateText(artist.title || "", 20)}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {artistsData && artistsData.total_pages > 1 && (
                <Box display="flex" justifyContent="center" mt={3}>
                  <Pagination
                    count={artistsData.total_pages}
                    page={artistsPage}
                    onChange={(_event, page) => setArtistsPage(page)}
                    color="primary"
                    sx={{
                      "& .MuiPaginationItem-root": {
                        color: "#C9A726",
                      },
                      "& .MuiPaginationItem-root.Mui-selected": {
                        backgroundColor: "#C9A726",
                        color: "white",
                      },
                    }}
                  />
                </Box>
              )}
            </>
          )}
        </TabPanel>
      </Box>

      <PlaybackModal
        isOpen={playbackModalOpen}
        onClose={handleClosePlaybackModal}
        item={selectedPlaybackItem}
      />

      {/* Delete Album Confirmation Modal */}
      <Dialog open={deleteAlbumModalOpen} onClose={closeDeleteModals}>
        <DialogTitle>Remove Album from Collection</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove "{itemToDelete?.title}" from this
            collection? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteModals}>Cancel</Button>
          <Button
            onClick={confirmDeleteAlbum}
            color="error"
            variant="contained"
            disabled={removeAlbumMutation.isPending}
          >
            {removeAlbumMutation.isPending ? "Removing..." : "Remove"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Artist Confirmation Modal */}
      <Dialog open={deleteArtistModalOpen} onClose={closeDeleteModals}>
        <DialogTitle>Remove Artist from Collection</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove "{itemToDelete?.title}" from this
            collection? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteModals}>Cancel</Button>
          <Button
            onClick={confirmDeleteArtist}
            color="error"
            variant="contained"
            disabled={removeArtistMutation.isPending}
          >
            {removeArtistMutation.isPending ? "Removing..." : "Remove"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
