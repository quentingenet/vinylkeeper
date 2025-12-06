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
  type PaginatedCollectionResponse,
  type CollectionResponse,
} from "@services/CollectionApiService";
import CollectionItem from "@components/Collections/CollectionItem";
import PaginationWithEllipsis from "@components/UI/PaginationWithEllipsis";
import VinylSpinner from "@components/UI/VinylSpinner";
import { useState } from "react";
import useDetectMobile from "@hooks/useDetectMobile";
import { useNavigate } from "react-router-dom";
import { ITEMS_PER_PAGE } from "@utils/GlobalUtils";

type SortOption = "updated_at" | "likes_count" | "created_at";

export default function Explore() {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortOption>("likes_count");
  const itemsPerPage = ITEMS_PER_PAGE;
  const { isMobile } = useDetectMobile();
  const navigate = useNavigate();

  const {
    data: publicCollectionsData,
    isLoading,
    error,
  } = useQuery<PaginatedCollectionResponse>({
    queryKey: ["publicCollections", page, sortBy],
    queryFn: () =>
      collectionApiService.getPublicCollections(page, itemsPerPage, sortBy),
    refetchOnWindowFocus: true,
    refetchOnMount: "always", // Always refetch on mount to get latest data
    staleTime: 0, // Always consider data stale to allow immediate refetch after invalidation
  });

  const publicCollections: CollectionResponse[] =
    publicCollectionsData?.items || [];
  const totalPages = publicCollectionsData?.total_pages || 0;

  const handleSortChange = (event: SelectChangeEvent<SortOption>) => {
    setSortBy(event.target.value as SortOption);
    setPage(1);
  };

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="200px"
      >
        <VinylSpinner />
      </Box>
    );
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
                borderColor: "#C9A726",
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
            {publicCollections.map((collection: CollectionResponse) => (
              <CollectionItem
                key={`${collection.id}-${page}-${sortBy}`}
                collection={collection}
                onSwitchArea={() => {}}
                handleOpenModalCollection={() => {}}
                onCollectionClick={(collection) => {
                  navigate(`/collections/${collection.id}`, {
                    state: { from: "explore" },
                  });
                }}
                isOwner={false}
                showOwner={true}
              />
            ))}
          </Box>
        ) : (
          <Box width="100%" textAlign="center">
            <Typography variant="body1" color="text.secondary">
              No public collections available at the moment.
            </Typography>
          </Box>
        )}
      </Box>

      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={4} mb={2}>
          <PaginationWithEllipsis
            count={totalPages}
            page={page}
            onChange={(newPage) => setPage(newPage)}
            color="primary"
            size={isMobile ? "medium" : "large"}
          />
        </Box>
      )}
    </Box>
  );
}
