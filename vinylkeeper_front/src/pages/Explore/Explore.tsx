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
import { useState, useMemo } from "react";
import useDetectMobile from "@hooks/useDetectMobile";
import { useNavigate } from "react-router-dom";

type SortOption = "updated_at" | "likes_count" | "created_at";

export default function Explore() {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortOption>("likes_count");
  const itemsPerPage = 6;
  const { isMobile } = useDetectMobile();
  const navigate = useNavigate();

  const {
    data: publicCollectionsData,
    isLoading,
    error,
  } = useQuery<PaginatedCollectionResponse>({
    queryKey: ["publicCollections", page],
    queryFn: () =>
      collectionApiService.getPublicCollections(page, itemsPerPage),
    refetchOnWindowFocus: true,
  });

  const publicCollections: CollectionResponse[] =
    publicCollectionsData?.items || [];
  const totalPages = publicCollectionsData?.total_pages || 0;

  // Sort collections based on selected option
  const sortedCollections = useMemo(() => {
    if (!publicCollections.length) return [];

    return [...publicCollections].sort((a, b) => {
      switch (sortBy) {
        case "likes_count":
          return b.likes_count - a.likes_count; // Most likes first
        case "created_at":
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          ); // Newest first
        case "updated_at":
        default:
          return (
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          ); // Recently updated first
      }
    });
  }, [publicCollections, sortBy]);

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
        <Typography variant="h4" component="h1" sx={{ color: "white" }}>
          Explore public shared collections
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
        {sortedCollections.length > 0 ? (
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
            {sortedCollections.map((collection: CollectionResponse) => (
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
            <Typography variant="body1">
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
