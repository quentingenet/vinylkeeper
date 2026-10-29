import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import {
  collectionApiService,
  type PaginatedCollectionListResponse,
  type CollectionListItemResponse,
} from "@services/CollectionApiService";
import CollectionItem from "@components/Collections/CollectionItem";
import CollectionGrid from "@components/Collections/CollectionGrid";
import CollectionsPagination from "@components/Collections/CollectionsPagination";
import LoadingCenter from "@components/UI/LoadingCenter";
import useDetectMobile from "@hooks/useDetectMobile";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ITEMS_PER_PAGE } from "@utils/GlobalUtils";
import { queryKeys } from "@utils/queryKeys";
import { COLLECTIONS_PAGE_PARAM, COMMUNITY_SORT_PARAM } from "@utils/GlobalUrls";
import { useUrlPage } from "@hooks/useUrlPage";

type SortOption = "updated_at" | "likes_count" | "created_at";

const SORT_OPTIONS: readonly SortOption[] = ["likes_count", "updated_at", "created_at"];
const DEFAULT_SORT: SortOption = "likes_count";

const isSortOption = (value: string | null): value is SortOption =>
  SORT_OPTIONS.includes(value as SortOption);

export default function CommunityCollectionsPanel() {
  const [page, setPage] = useUrlPage(COLLECTIONS_PAGE_PARAM);
  const [searchParams, setSearchParams] = useSearchParams();
  const sortParam = searchParams.get(COMMUNITY_SORT_PARAM);
  const sortBy: SortOption = isSortOption(sortParam) ? sortParam : DEFAULT_SORT;
  const itemsPerPage = ITEMS_PER_PAGE;
  const { isMobile } = useDetectMobile();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    data: publicCollectionsData,
    isLoading,
    error,
  } = useQuery<PaginatedCollectionListResponse>({
    queryKey: queryKeys.collections.public.list(page, sortBy),
    queryFn: () =>
      collectionApiService.getPublicCollections(page, itemsPerPage, sortBy),
    refetchOnWindowFocus: true,
    refetchOnMount: "always", // Always refetch on mount to get latest data
    staleTime: 0, // Always consider data stale to allow immediate refetch after invalidation
  });

  const publicCollections: CollectionListItemResponse[] =
    publicCollectionsData?.items || [];
  const totalPages = publicCollectionsData?.total_pages || 0;

  const handleSortChange = (event: SelectChangeEvent<SortOption>) => {
    const nextSort = event.target.value as SortOption;
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (nextSort === DEFAULT_SORT) {
          next.delete(COMMUNITY_SORT_PARAM);
        } else {
          next.set(COMMUNITY_SORT_PARAM, nextSort);
        }
        // A new sort starts again at the first page
        next.delete(COLLECTIONS_PAGE_PARAM);
        return next;
      },
      { replace: true }
    );
  };

  if (isLoading) {
    return <LoadingCenter />;
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h6" color="white">
          Error loading public collections
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box
        display="flex"
        flexDirection={isMobile ? "column" : "row"}
        justifyContent="space-between"
        alignItems="center"
        mb={3}
        gap={4}
      >
        <Typography variant="h6" color="white">
          Explore public and shared vinyl collections from other users on the
          platform.
        </Typography>

        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel sx={{ color: "white" }}>Sort by</InputLabel>
          <Select
            value={sortBy}
            label="Sort by"
            onChange={handleSortChange}
            sx={{
              color: "white",
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
                color: "white",
              },
            }}
          >
            <MenuItem value="updated_at">Recently Updated</MenuItem>
            <MenuItem value="likes_count">Most Liked</MenuItem>
            <MenuItem value="created_at">Newest</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Box mb={4}>
        {publicCollections.length > 0 ? (
          <CollectionGrid>
            {publicCollections.map((collection: CollectionListItemResponse) => (
              <CollectionItem
                key={`${collection.id}-${page}-${sortBy}`}
                collection={collection}
                onSwitchArea={() => {}}
                handleOpenModalCollection={() => {}}
                onCollectionClick={(collection) => {
                  void navigate(`/collections/${collection.id}`, {
                    state: { backTo: `${location.pathname}${location.search}` },
                  });
                }}
                isOwner={false}
                showOwner={true}
              />
            ))}
          </CollectionGrid>
        ) : (
          <Box width="100%" textAlign="center">
            <Typography variant="body1" color="text.secondary">
              No public collections available at the moment.
            </Typography>
          </Box>
        )}
      </Box>

      <CollectionsPagination
        totalPages={totalPages}
        page={page}
        onChange={setPage}
      />
    </Box>
  );
}
