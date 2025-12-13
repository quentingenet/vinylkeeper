import React, { useState } from "react";
import PlaceMap from "@components/Places/PlaceMap";
import PlaceAddModal from "@components/Places/PlaceAddModal";
import { Box, Typography, Fab, Tooltip } from "@mui/material";
import { Add } from "@mui/icons-material";
import {
  placeApiService,
  PlaceMapResponse,
  CreatePlaceData,
} from "@services/PlaceApiService";
import useDetectMobile from "@hooks/useDetectMobile";
import { growItem } from "@utils/Animations";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import VinylSpinner from "@components/UI/VinylSpinner";

export default function Places() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isMobile } = useDetectMobile();
  const queryClient = useQueryClient();

  const {
    data: mapPlaces = [],
    isLoading,
    error,
  } = useQuery<PlaceMapResponse[]>({
    queryKey: ["places-map"],
    queryFn: () => placeApiService.getPlacesMap(),
    staleTime: 5 * 60 * 1000, // 5 minutes - map data doesn't change frequently
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const handleAddPlace = async (placeData: CreatePlaceData) => {
    try {
      await placeApiService.createPlace(placeData);
      // Invalidate places queries to refetch data
      void queryClient.invalidateQueries({ queryKey: ["places-map"] });
      void queryClient.invalidateQueries({ queryKey: ["places"] });
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error creating place:", error);
      throw error;
    }
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
          📍 Browse and share the best vinyl spots around the world with the
          community.
        </Typography>
        </Box>

        <Box sx={{ position: "relative", display: "flex", justifyContent: "center" }}>
          <PlaceMap mapPlaces={mapPlaces} />

          {/* Add Place Button - positioned on top of the map */}
          <Tooltip title="Add a new place" placement="bottom">
            <Fab
              color="primary"
              aria-label="add place"
              onClick={() => setIsModalOpen(true)}
              sx={{
                position: "absolute",
                top: 16,
                right: 16,
                backgroundColor: "#C9A726",
                "&:hover": {
                  backgroundColor: "#B8961F",
                },
                zIndex: 1000,
                animation: `${growItem} 1.3s infinite`,
                boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
              }}
            >
              <Add />
            </Fab>
          </Tooltip>
        </Box>
      </Box>

      {/* Add Place Modal */}
      <PlaceAddModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddPlace}
        isMobile={isMobile}
      />
    </Box>
  );
}
