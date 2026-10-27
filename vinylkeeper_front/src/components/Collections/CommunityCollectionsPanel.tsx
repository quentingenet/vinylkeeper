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
import { useState } from "react";
import useDetectMobile from "@hooks/useDetectMobile";
import { useNavigate } from "react-router-dom";
import { ITEMS_PER_PAGE } from "@utils/GlobalUtils";
import { queryKeys } from "@utils/queryKeys";

type SortOption = "updated_at" | "likes_count" | "created_at";

export default function CommunityCollectionsPanel() {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortOption>("likes_count");
  const itemsPerPage = ITEMS_PER_PAGE;
  const { isMobile } = useDetectMobile();
  const navigate = useNavigate();

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
    setSortBy(event.target.value as SortOption);
    setPage(1);
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
                    state: { from: "explore" },
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
