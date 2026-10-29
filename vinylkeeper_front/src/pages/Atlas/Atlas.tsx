import { logger } from "@utils/logger";
import { useState } from "react";
import AtlasMap from "@components/Atlas/AtlasMap";
import AtlasSpotAddModal from "@components/Atlas/AtlasSpotAddModal";
import { Box, Typography } from "@mui/material";
import {
  atlasApiService,
  PlaceMapResponse,
  CreatePlaceData,
} from "@services/AtlasApiService";
import useDetectMobile from "@hooks/useDetectMobile";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@utils/queryKeys";
import LoadingCenter from "@components/UI/LoadingCenter";
import { colors } from "@styles/colors";

export default function Atlas() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isMobile } = useDetectMobile();
  const {
    data: mapPlaces = [],
    isLoading,
    error,
  } = useQuery<PlaceMapResponse[]>({
    queryKey: queryKeys.places.map(),
    queryFn: () => atlasApiService.getPlacesMap(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const handleAddPlace = async (placeData: CreatePlaceData) => {
    try {
      await atlasApiService.createPlace(placeData);
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
          Error loading the Atlas
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        backgroundColor: colors.raised,
        color: colors.textMuted,
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
          <AtlasMap
            mapPlaces={mapPlaces}
            onAddPlace={() => setIsModalOpen(true)}
          />
        </Box>
      </Box>

      <AtlasSpotAddModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddPlace}
        isMobile={isMobile}
      />
    </Box>
  );
}
