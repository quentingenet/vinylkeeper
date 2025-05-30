import { Box, Typography, Pagination } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { getPublicCollections } from "@services/CollectionService";
import CollectionItem from "@components/Collections/CollectionItem";
import { ICollectionResponse } from "@models/ICollectionForm";
import { useState } from "react";
import useDetectMobile from "@hooks/useDetectMobile";

export default function Explore() {
  const [page, setPage] = useState(1);
  const itemsPerPage = 12;
  const { isMobile } = useDetectMobile();

  const {
    data: publicCollectionsData,
    isLoading,
    error,
  } = useQuery<ICollectionResponse>({
    queryKey: ["publicCollections", page],
    queryFn: () => getPublicCollections(page, itemsPerPage),
  });

  const publicCollections = publicCollectionsData?.items || [];
  const totalPages = publicCollectionsData?.total_pages || 0;

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="200px"
      >
        <Typography>Loading public collections...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h6" color="error">
          Error loading public collections
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        sx={{ color: "white", mb: 3 }}
      >
        Explore public shared collections
      </Typography>

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
            {publicCollections.map((collection) => (
              <CollectionItem
                key={collection.id}
                collection={collection}
                onSwitchArea={() => {}}
                refreshCollections={() => {}}
                handleOpenModalCollection={() => {}}
                onCollectionClick={(id) => {
                  window.location.href = `/collections/${id}`;
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
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, newPage) => setPage(newPage)}
            color="primary"
            size={isMobile ? "medium" : "large"}
            shape="circular"
          />
        </Box>
      )}

      <Box mt={6}>
        <Typography variant="h5" sx={{ color: "white", mb: 2 }}>
          Coming soon...
        </Typography>
        <Box sx={{ color: "text.secondary" }}>
          <Typography variant="body1" mb={1}>
            🎵 Personalized album recommendations
          </Typography>
          <Typography variant="body1" mb={1}>
            🎤 Personalized artist recommendations
          </Typography>
          <Typography variant="body1">
            🤖 Recommendations based on your musical tastes
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
