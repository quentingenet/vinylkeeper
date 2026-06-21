import { logger } from "@utils/logger";
import { useParams, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  collectionApiService,
  type CollectionDetailResponse,
  type PaginatedAlbumsResponse,
  type PaginatedArtistsResponse,
  type CollectionAlbumResponse,
  type CollectionArtistResponse,
} from "@services/CollectionApiService";
import { externalReferenceApiService } from "@services/ExternalReferenceService";
import {
  type WishlistItemResponse,
  type PaginatedWishlistResponse,
} from "@models/IExternalReference";
import { useWishlist } from "@hooks/useWishlist";
import {
  Typography,
  Box,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  TextField,
  InputAdornment,
} from "@mui/material";
import { useEffect, useState, useMemo } from "react";
import useDetectMobile from "@hooks/useDetectMobile";
import { useDocumentTitle } from "@hooks/useDocumentTitle";
import { useUserContext } from "@contexts/UserContext";
import { useDebounce } from "@hooks/useDebounce";
import SearchIcon from "@mui/icons-material/Search";
import PlaybackModal, { PlaybackItem } from "@components/Modals/PlaybackModal";
import { VinylStateEnum } from "@utils/GlobalUtils";
import { queryKeys } from "@utils/queryKeys";
import ConfirmDeleteDialog from "@components/Collections/ConfirmDeleteDialog";
import CollectionExportMenu from "@components/Collections/CollectionExportMenu";
import CollectionItemGrid from "@components/Collections/CollectionItemGrid";
import WishlistTabContent from "@components/Collections/WishlistTabContent";
import LoadingCenter from "@components/UI/LoadingCenter";
import EmptyState from "@components/UI/EmptyState";
import VinylSpinner from "@components/UI/VinylSpinner";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

interface PlayableItem {
  external_id?: string;
  external_album_id?: string;
  external_artist_id?: string;
  title?: string;
  name?: string;
  artist_name?: string;
  image_url?: string;
  state_record?: VinylStateEnum | null;
  state_cover?: VinylStateEnum | null;
  acquisition_month_year?: string | null;
  id?: number;
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

const TAB = {
  ALBUMS: 0,
  ARTISTS: 1,
  WISHLIST: 2,
} as const;

export default function CollectionDetails() {
  const { id } = useParams<{ id: string }>();
  const collectionId = id ? parseInt(id) : 0;
  const { isMobile } = useDetectMobile();
  const { currentUser, isUserLoggedIn } = useUserContext();
  const queryClient = useQueryClient();
  const location = useLocation();

  // Check if we came from Explore page
  const isFromExplore = (location.state as { from?: string } | null)?.from === "explore";

  // Tab state
  const [tabValue, setTabValue] = useState(0);

  // Sort order state
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");

  // Search state
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>("");

  // Pagination states
  const [albumsPage, setAlbumsPage] = useState(1);
  const [artistsPage, setArtistsPage] = useState(1);
  const [wishlistPage, setWishlistPage] = useState(1);
  const limit = 8;
  const wishlistLimit = 8;

  // Modal states
  const [playbackModalOpen, setPlaybackModalOpen] = useState(false);
  const [selectedPlaybackItem, setSelectedPlaybackItem] =
    useState<PlaybackItem | null>(null);
  const [deleteAlbumModalOpen, setDeleteAlbumModalOpen] = useState(false);
  const [deleteArtistModalOpen, setDeleteArtistModalOpen] = useState(false);
  const [deleteWishlistModalOpen, setDeleteWishlistModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{
    id: number;
    type: "album" | "artist";
    title: string;
  } | null>(null);
  const [wishlistItemToDelete, setWishlistItemToDelete] =
    useState<WishlistItemResponse | null>(null);

  // Collection details query
  const {
    data: collectionDetails,
    isLoading: isLoadingDetails,
    error: detailsError,
  } = useQuery<CollectionDetailResponse>({
    queryKey: queryKeys.collections.detail(collectionId),
    queryFn: () => collectionApiService.getCollectionDetails(collectionId),
    enabled: !!collectionId,
  });

  // Albums paginated query
  const {
    data: albumsData,
    isLoading: isLoadingAlbums,
    error: albumsError,
  } = useQuery<PaginatedAlbumsResponse>({
    queryKey: queryKeys.collections.albumsPage(collectionId, albumsPage, sortOrder),
    queryFn: () =>
      collectionApiService.getCollectionAlbumsPaginated(
        collectionId,
        albumsPage,
        limit,
        sortOrder
      ),
    enabled: !!collectionId && tabValue === TAB.ALBUMS,
  });

  // Artists paginated query
  const {
    data: artistsData,
    isLoading: isLoadingArtists,
    error: artistsError,
  } = useQuery<PaginatedArtistsResponse>({
    queryKey: queryKeys.collections.artistsPage(collectionId, artistsPage, sortOrder),
    queryFn: () =>
      collectionApiService.getCollectionArtistsPaginated(
        collectionId,
        artistsPage,
        limit,
        sortOrder
      ),
    enabled: !!collectionId && tabValue === TAB.ARTISTS,
  });

  // Wishlist query - load collection owner's wishlist with pagination (public)
  const shouldLoadWishlist = tabValue === TAB.WISHLIST && !!collectionDetails?.owner_uuid;
  const ownerUuid = collectionDetails?.owner_uuid != null ? collectionDetails.owner_uuid : undefined;

  const wishlistSearch = tabValue === TAB.WISHLIST && debouncedSearchTerm.length >= 2 ? debouncedSearchTerm : undefined;

  const {
    wishlistItems: ownerWishlistItems,
    totalPages: wishlistTotalPages,
    total: wishlistTotal,
    wishlistLoading: isLoadingWishlist,
  } = useWishlist(wishlistPage, wishlistLimit, shouldLoadWishlist, ownerUuid, sortOrder, wishlistSearch);

  // Search query with debounced term (albums and artists only — wishlist uses server-side search)
  const {
    data: searchResults,
    isLoading: isLoadingSearch,
    refetch: refetchSearch,
  } = useQuery({
    queryKey: queryKeys.collections.searchQuery(collectionId, debouncedSearchTerm, tabValue),
    queryFn: () => {
      const searchType =
        tabValue === TAB.ALBUMS ? "album" : "artist";
      return collectionApiService.searchCollectionItems(
        collectionId,
        debouncedSearchTerm,
        searchType
      );
    },
    enabled:
      !!debouncedSearchTerm.trim() &&
      debouncedSearchTerm.length >= 2 &&
      !!collectionId &&
      tabValue !== TAB.WISHLIST,
  });

  // Convert WishlistItemListResponse to WishlistItemResponse for compatibility
  const wishlistItemsAsResponse: WishlistItemResponse[] = useMemo(() => {
    return ownerWishlistItems.map((item) => ({
      id: item.id,
      user_id: 0,
      external_id: item.external_id,
      entity_type_id: item.entity_type === "album" ? 1 : 2,
      external_source_id: 0,
      title: item.title,
      image_url: item.image_url || "",
      created_at: item.created_at,
      entity_type: item.entity_type,
      source: "",
    }));
  }, [ownerWishlistItems]);

  const removeAlbumMutation = useMutation({
    mutationFn: (albumId: number) =>
      collectionApiService.removeAlbumFromCollection(collectionId, albumId),
    onSuccess: (_data, albumId) => {
      queryClient.setQueryData<PaginatedAlbumsResponse>(
        queryKeys.collections.albumsPage(collectionId, albumsPage, sortOrder),
        (old) =>
          old
            ? { ...old, items: old.items.filter((item) => item.id !== albumId), total: Math.max(0, old.total - 1) }
            : old
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.collections.detail(collectionId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.collections.albums(collectionId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.collections.search(collectionId) });
    },
  });

  const removeArtistMutation = useMutation({
    mutationFn: (artistId: number) =>
      collectionApiService.removeArtistFromCollection(collectionId, artistId),
    onSuccess: (_data, artistId) => {
      queryClient.setQueryData<PaginatedArtistsResponse>(
        queryKeys.collections.artistsPage(collectionId, artistsPage, sortOrder),
        (old) =>
          old
            ? { ...old, items: old.items.filter((item) => item.id !== artistId), total: Math.max(0, old.total - 1) }
            : old
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.collections.detail(collectionId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.collections.artists(collectionId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.collections.search(collectionId) });
    },
  });

  const removeWishlistItemMutation = useMutation({
    mutationFn: (wishlistId: number) =>
      externalReferenceApiService.removeFromWishlist(wishlistId),
    onSuccess: (_data, wishlistId) => {
      queryClient.setQueriesData<PaginatedWishlistResponse>(
        { queryKey: queryKeys.wishlist.all() },
        (old) => {
          if (!old) return old;
          const hadItem = old.items.some((item) => item.id === wishlistId);
          return {
            ...old,
            items: old.items.filter((item) => item.id !== wishlistId),
            total: hadItem ? Math.max(0, old.total - 1) : old.total,
          };
        }
      );
      // Avoid empty page after last-item deletion: go back to the previous page
      if (ownerWishlistItems.length === 1 && wishlistPage > 1) {
        setWishlistPage((prev) => prev - 1);
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.collections.detail(collectionId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.wishlist.all() });
    },
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    // If user is not logged in and tries to access wishlist tab (index 2), redirect to albums tab
    if (newValue === 2 && !isUserLoggedIn) {
      setTabValue(0);
    } else {
      setTabValue(newValue);
    }
  };

  const handleSortOrderChange = (event: SelectChangeEvent<SortOrder>) => {
    setSortOrder(event.target.value as SortOrder);
    setAlbumsPage(1);
    setArtistsPage(1);
    setWishlistPage(1);
  };

  const handleSearchTermChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
  };

  useDebounce(() => {
    setDebouncedSearchTerm(searchTerm);
    if (tabValue === TAB.WISHLIST) setWishlistPage(1);
  }, 500, [searchTerm]);

  const handleSearch = () => {
    if (searchTerm.trim() && searchTerm.length >= 2 && tabValue !== TAB.WISHLIST) {
      void refetchSearch();
    }
  };

  // Clear search when tab changes
  useEffect(() => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
  }, [tabValue]);

  const getSearchPlaceholder = () => {
    switch (tabValue) {
      case 0:
        return "Search album";
      case 1:
        return "Search artist";
      case 2:
        return "Search artist or album";
      default:
        return "Search";
    }
  };

  const handlePlayClick = (item: PlayableItem, type: "album" | "artist") => {
    // For wishlist items, use external_id directly
    // For collection items, use external_album_id or external_artist_id
    const externalId =
      item.external_id ||
      (type === "album" ? item.external_album_id : item.external_artist_id);

    // Validate external ID
    if (!externalId || externalId.trim() === "") {
      logger.warn(`Invalid external ID for ${type}:`, externalId, item);
      return;
    }

    // Validate that external ID is numeric
    if (!/^\d+$/.test(externalId)) {
      logger.warn(`Non-numeric external ID for ${type}:`, externalId, item);
      return;
    }

    const playbackItem: PlaybackItem = {
      id: externalId,
      title: item.title || item.name || "",
      artist: type === "album" ? item.artist_name || "" : "",
      image_url: item.image_url || "",
      itemType: type,
      internalId: type === "album" ? item.id?.toString() : undefined,
      albumData:
        type === "album"
          ? {
              state_record: item.state_record ?? undefined,
              state_cover: item.state_cover ?? undefined,
              acquisition_month_year: item.acquisition_month_year ?? undefined,
            }
          : undefined,
    };

    setSelectedPlaybackItem(playbackItem);
    setPlaybackModalOpen(true);
  };

  const handleClosePlaybackModal = () => {
    setPlaybackModalOpen(false);
    setSelectedPlaybackItem(null);
  };

  const handleDeleteAlbum = (album: CollectionAlbumResponse) => {
    setItemToDelete({ id: album.id, type: "album", title: album.title });
    setDeleteAlbumModalOpen(true);
  };

  const handleDeleteArtist = (artist: CollectionArtistResponse) => {
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
    setDeleteWishlistModalOpen(false);
    setItemToDelete(null);
    setWishlistItemToDelete(null);
  };

  const handleDeleteWishlistItem = (item: WishlistItemResponse) => {
    setWishlistItemToDelete(item);
    setDeleteWishlistModalOpen(true);
  };

  const confirmDeleteWishlistItem = () => {
    if (wishlistItemToDelete) {
      removeWishlistItemMutation.mutate(wishlistItemToDelete.id);
      setDeleteWishlistModalOpen(false);
      setWishlistItemToDelete(null);
    }
  };

  useDocumentTitle(
    collectionDetails?.name ? `${collectionDetails.name} - VinylKeeper` : null
  );

  if (isLoadingDetails) {
    return <LoadingCenter />;
  }

  if (!isLoadingDetails && detailsError) {
    return (
      <Box>
        <Typography variant="h6" color="error">
          Collection not found
        </Typography>
      </Box>
    );
  }

  if (!collectionDetails) {
    return <LoadingCenter />;
  }

  const isOwner = !!(
    isUserLoggedIn &&
    currentUser?.user_uuid === collectionDetails?.owner?.user_uuid
  );

  return (
    <Box
      sx={{
        padding: isMobile ? "16px" : "32px",
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
            sx={{ color: "primary.main" }}
          >
            {collectionDetails.name || "Collection"}
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary" paragraph>
          {collectionDetails.description || "No description available"}
        </Typography>
        <Box
          sx={{
            mb: 1,
            width: "100%",
            display: "flex",
            alignItems: "center",
            columnGap: 2,
          }}
        >
          {isOwner && <CollectionExportMenu collectionId={collectionId} />}

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Created on{" "}
            {collectionDetails.created_at
              ? new Date(collectionDetails.created_at).toLocaleDateString()
              : "Unknown date"}
            {collectionDetails.owner &&
              ` by ${collectionDetails.owner.username}`}
          </Typography>
        </Box>

        {/* Sort order dropdown and search bar */}
        <Box
          sx={{
            mb: 1,
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            gap: 2,
            justifyContent: "space-between",
          }}
        >
          {/* Search section */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {/* Search bar */}
            <TextField
              sx={{ width: isMobile ? "320px" : "400px" }}
              label={`${getSearchPlaceholder()} in my collection`}
              variant="outlined"
              value={searchTerm}
              onChange={handleSearchTermChange}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              disabled={isLoadingSearch}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      {isLoadingSearch ? (
                        <VinylSpinner size={24} />
                      ) : (
                        <SearchIcon
                          sx={{
                            color: "text.secondary",
                            cursor: "pointer",
                          }}
                          onClick={handleSearch}
                        />
                      )}
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>

          {/* Sort order dropdown */}
          <Box
            sx={{
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              gap: 2,
              alignItems: isMobile ? "stretch" : "center",
              justifyContent: "flex-end",
            }}
          >
            {((tabValue === TAB.ALBUMS &&
            albumsData?.items &&
            albumsData.items.length > 0) ||
            (tabValue === TAB.ARTISTS &&
              artistsData?.items &&
              artistsData.items.length > 0) ||
            tabValue === TAB.WISHLIST) && (
              <FormControl sx={{ width: isMobile ? 320 : 150 }}>
                <InputLabel sx={{ color: "text.secondary" }}>
                  Sort Order
                </InputLabel>
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
                      borderColor: "primary.main",
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
          )}
          </Box>
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
              color: "primary.main",
              "&.Mui-selected": { color: "primary.main" },
            },
            "& .MuiTabs-indicator": { backgroundColor: "primary.main" },
          }}
        >
          <Tab label="Albums" />
          <Tab label="Artists" />
          {isUserLoggedIn && <Tab label="Wishlist" />}
        </Tabs>
      </Box>

      {/* Contenu normal */}
      <Box sx={{ mt: 3 }}>
        <TabPanel value={tabValue} index={TAB.ALBUMS}>
          {isLoadingSearch ? (
            <LoadingCenter />
          ) : searchTerm.trim() && searchTerm.length < 2 ? (
            <EmptyState message="Please enter at least 2 characters to search." />
          ) : searchResults && debouncedSearchTerm.trim() ? (
            searchResults.albums.length === 0 ? (
              <EmptyState message={`No albums found matching "${debouncedSearchTerm}".`} />
            ) : (
              <>
                <Typography variant="h6" sx={{ mb: 2, color: "primary.main" }}>
                  Search results for &ldquo;{debouncedSearchTerm}&rdquo; ({searchResults.albums.length} albums)
                </Typography>
                <CollectionItemGrid
                  items={searchResults.albums}
                  itemType="album"
                  onPlay={(item) => handlePlayClick(item as CollectionAlbumResponse, "album")}
                  onDelete={isOwner ? (item) => handleDeleteAlbum(item as CollectionAlbumResponse) : undefined}
                  imageSize={{ w: 300, h: 300, q: 75 }}
                />
              </>
            )
          ) : isLoadingAlbums ? (
            <LoadingCenter />
          ) : !isLoadingAlbums && albumsError ? (
            <Typography variant="h6" color="error">
              Error loading albums
            </Typography>
          ) : albumsData?.items.length === 0 ? (
            <EmptyState message="No albums in this collection yet." />
          ) : (
            <CollectionItemGrid
              items={albumsData?.items ?? []}
              itemType="album"
              onPlay={(item) => handlePlayClick(item as CollectionAlbumResponse, "album")}
              onDelete={isOwner ? (item) => handleDeleteAlbum(item as CollectionAlbumResponse) : undefined}
              imageSize={{ w: 500, h: 500, q: 85 }}
              totalPages={albumsData?.total_pages}
              page={albumsPage}
              onPageChange={setAlbumsPage}
              isMobile={isMobile}
            />
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={TAB.ARTISTS}>
          {isLoadingSearch ? (
            <LoadingCenter />
          ) : searchTerm.trim() && searchTerm.length < 2 ? (
            <EmptyState message="Please enter at least 2 characters to search." />
          ) : searchResults && debouncedSearchTerm.trim() ? (
            searchResults.artists.length === 0 ? (
              <EmptyState message={`No artists found matching "${debouncedSearchTerm}".`} />
            ) : (
              <>
                <Typography variant="h6" sx={{ mb: 2, color: "primary.main" }}>
                  Search results for &ldquo;{debouncedSearchTerm}&rdquo; ({searchResults.artists.length} artists)
                </Typography>
                <CollectionItemGrid
                  items={searchResults.artists}
                  itemType="artist"
                  onPlay={(item) => handlePlayClick(item as CollectionArtistResponse, "artist")}
                  onDelete={isOwner ? (item) => handleDeleteArtist(item as CollectionArtistResponse) : undefined}
                  imageSize={{ w: 300, h: 300, q: 75 }}
                />
              </>
            )
          ) : isLoadingArtists ? (
            <LoadingCenter />
          ) : !isLoadingArtists && artistsError ? (
            <Typography variant="h6" color="error">
              Error loading artists
            </Typography>
          ) : artistsData?.items.length === 0 ? (
            <EmptyState message="No artists in this collection yet." />
          ) : (
            <CollectionItemGrid
              items={artistsData?.items ?? []}
              itemType="artist"
              onPlay={(item) => handlePlayClick(item as CollectionArtistResponse, "artist")}
              onDelete={isOwner ? (item) => handleDeleteArtist(item as CollectionArtistResponse) : undefined}
              imageSize={{ w: 500, h: 500, q: 85 }}
              totalPages={artistsData?.total_pages}
              page={artistsPage}
              onPageChange={setArtistsPage}
              isMobile={isMobile}
            />
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={TAB.WISHLIST}>
          <WishlistTabContent
            isLoading={isLoadingWishlist}
            searchTerm={searchTerm}
            debouncedSearchTerm={debouncedSearchTerm}
            items={wishlistItemsAsResponse}
            total={wishlistTotal}
            totalPages={wishlistTotalPages}
            page={wishlistPage}
            onPageChange={setWishlistPage}
            onPlay={handlePlayClick}
            onDelete={isOwner ? handleDeleteWishlistItem : undefined}
          />
        </TabPanel>
      </Box>

      <PlaybackModal
        isOpen={playbackModalOpen}
        onClose={handleClosePlaybackModal}
        item={selectedPlaybackItem}
        context={tabValue === TAB.WISHLIST ? "wishlist" : "collection"}
        isOwner={isOwner}
        isExplorePage={isFromExplore}
      />

      <ConfirmDeleteDialog
        open={deleteAlbumModalOpen}
        title="Remove Album from Collection"
        message={`Are you sure you want to remove "${itemToDelete?.title}" from this collection? This action cannot be undone.`}
        isPending={removeAlbumMutation.isPending}
        onConfirm={confirmDeleteAlbum}
        onClose={closeDeleteModals}
      />

      <ConfirmDeleteDialog
        open={deleteArtistModalOpen}
        title="Remove Artist from Collection"
        message={`Are you sure you want to remove "${itemToDelete?.title}" from this collection? This action cannot be undone.`}
        isPending={removeArtistMutation.isPending}
        onConfirm={confirmDeleteArtist}
        onClose={closeDeleteModals}
      />

      <ConfirmDeleteDialog
        open={deleteWishlistModalOpen}
        title="Remove from Wishlist"
        message={`Are you sure you want to remove "${wishlistItemToDelete?.title}" from your wishlist? This action cannot be undone.`}
        isPending={removeWishlistItemMutation.isPending}
        onConfirm={confirmDeleteWishlistItem}
        onClose={closeDeleteModals}
      />
    </Box>
  );
}
