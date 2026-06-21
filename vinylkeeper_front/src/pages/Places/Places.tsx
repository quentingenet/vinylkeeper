import { logger } from "@utils/logger";
import { useState } from "react";
import PlaceMap from "@components/Places/PlaceMap";
import PlaceAddModal from "@components/Places/PlaceAddModal";
import { Box, Typography } from "@mui/material";
import {
  placeApiService,
  PlaceMapResponse,
  CreatePlaceData,
} from "@services/PlaceApiService";
import useDetectMobile from "@hooks/useDetectMobile";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@utils/queryKeys";
import LoadingCenter from "@components/UI/LoadingCenter";

export default function Places() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isMobile } = useDetectMobile();
  const {
    data: mapPlaces = [],
    isLoading,
    error,
  } = useQuery<PlaceMapResponse[]>({
    queryKey: queryKeys.places.map(),
    queryFn: () => placeApiService.getPlacesMap(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const handleAddPlace = async (placeData: CreatePlaceData) => {
    try {
      await placeApiService.createPlace(placeData);
    } catch (error) {
      logger.error("Error creating place:", error);
      throw error;
    }
  };

  if (isLoading) {
    return <LoadingCenter />;
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h6" color="white">
          Error loading places
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        backgroundColor: "#313132",
        color: "#e4e4e4",
        minHeight: "100vh",
        position: "relative",
      }}
    >
      <Box sx={{ py: 3, px: { xs: 0, md: 3 } }}>
        <Box sx={{ px: { xs: 2, md: 0 } }}>
          <Typography
            variant="h6"
            component="div"
            sx={{ textAlign: "center", fontWeight: "bold", mb: 3 }}
          >
            📍 Browse, add and share the best vinyl spots around the world with the community.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <PlaceMap
            mapPlaces={mapPlaces}
            onAddPlace={() => setIsModalOpen(true)}
          />
        </Box>
      </Box>

      <PlaceAddModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddPlace}
        isMobile={isMobile}
      />
    </Box>
  );
}
