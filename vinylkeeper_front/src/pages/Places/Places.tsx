import React, { useState } from "react";
import PlaceMap from "@components/Places/PlaceMap";
import PlaceAddModal from "@components/Places/PlaceAddModal";
import { Box, Typography, Fab, Tooltip } from "@mui/material";
import { Add } from "@mui/icons-material";
import { placeApiService, Place } from "@services/PlaceApiService";
import useDetectMobile from "@hooks/useDetectMobile";
import { growItem } from "@utils/Animations";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import VinylSpinner from "@components/UI/VinylSpinner";

export default function Places() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isMobile } = useDetectMobile();
  const queryClient = useQueryClient();

  const {
    data: places = [],
    isLoading,
    error,
  } = useQuery<Place[]>({
    queryKey: ["places"],
    queryFn: () => placeApiService.getPlaces(),
    staleTime: 0, // Always consider data stale to get fresh data
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const handleAddPlace = async (placeData: any) => {
    try {
      const newPlace = await placeApiService.createPlace(placeData);
      // Invalidate places query to refetch data
      queryClient.invalidateQueries({ queryKey: ["places"] });
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
      <Box p={3}>
        <Typography
          variant="h6"
          component="div"
          sx={{ textAlign: "center", fontWeight: "bold", mb: 3 }}
        >
          📍 Discover & share vinyl places around the world with community
        </Typography>

        <Box sx={{ position: "relative" }}>
          <PlaceMap places={places} />

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
