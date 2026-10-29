import { logger } from "@utils/logger";
import { useState } from "react";
import AtlasMap from "@components/Atlas/AtlasMap";
import AtlasSpotAddModal from "@components/Atlas/AtlasSpotAddModal";
import JoinVinylKeeperDialog from "@components/Atlas/JoinVinylKeeperDialog";
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

interface AtlasProps {
  /** Visitor without an account: read only, liking or suggesting a spot invites to join */
  isPublic?: boolean;
}

export default function Atlas({ isPublic = false }: AtlasProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const openJoin = () => setIsJoinOpen(true);
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
        // Public: under the bar of PublicAtlas, the page fills what is left of the screen, no more
        ...(isPublic ? { flex: 1, pb: 5 } : { minHeight: "100vh" }),
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
            {isPublic
              ? "📍 Browse the best vinyl spots around the world, shared by the Vinyl Keeper community."
              : "📍 Browse, add and share the best vinyl spots around the world with the community."}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <AtlasMap
            mapPlaces={mapPlaces}
            onAddPlace={isPublic ? openJoin : () => setIsModalOpen(true)}
            onRequireAccount={isPublic ? openJoin : undefined}
          />
        </Box>
      </Box>

      {isPublic ? (
        <JoinVinylKeeperDialog open={isJoinOpen} onClose={() => setIsJoinOpen(false)} />
      ) : (
        <AtlasSpotAddModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleAddPlace}
          isMobile={isMobile}
        />
      )}
    </Box>
  );
}
