import React, { useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import { divIcon } from "leaflet";
import {
  Box,
  Typography,
  IconButton,
  Chip,
  CircularProgress,
  Modal,
  Fade,
  Backdrop,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Fab,
} from "@mui/material";
import {
  Favorite,
  FavoriteBorder,
  Close,
  ExpandMore,
  Add,
} from "@mui/icons-material";
import { growItem } from "@utils/Animations";
import { usePlaceLike } from "@hooks/usePlaceLike";
import { useQuery } from "@tanstack/react-query";
import {
  placeApiService,
  Place,
  PlaceMapResponse,
} from "@services/PlaceApiService";
import "leaflet/dist/leaflet.css";
import "./vinyl-marker.css";
import { queryKeys } from "@utils/queryKeys";

const vinylIcon = divIcon({
  html: `<div class="vinyl-marker"><img src="/images/vinylKeeper.svg" alt="vinyl spot" /></div>`,
  className: "",
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
});

interface PlaceMapProps {
  mapPlaces: PlaceMapResponse[];
  onAddPlace?: () => void;
}

const PlaceMap: React.FC<PlaceMapProps> = ({ mapPlaces, onAddPlace }) => {
  const defaultCenter: [number, number] = [48.8566, 2.3522]; // Paris
  const defaultZoom = 5;
  const [selectedLocation, setSelectedLocation] = useState<{
    country: string;
    city: string;
  } | null>(null);

  // Group places by country+city (one marker per location area)
  const groupedPlaces = useMemo(() => {
    const groups = new Map<string, PlaceMapResponse[]>();
    mapPlaces.forEach((place) => {
      const country = place.country ?? "";
      const city = place.city ?? "";
      const key = `${country}|${city}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)?.push(place);
    });
    return groups;
  }, [mapPlaces]);

  // One marker per group; use first place that has both country and city for by-location request
  const mapMarkers = useMemo(() => {
    return Array.from(groupedPlaces.entries()).map(([key, places]) => {
      const first = places[0];
      const withLocation = places.find((p) => p.country && p.city) ?? first;
      return {
        key,
        latitude: first.latitude,
        longitude: first.longitude,
        country: withLocation.country ?? "",
        city: withLocation.city ?? "",
      };
    });
  }, [groupedPlaces]);

  const {
    data: placesAtLocation,
    isLoading: isLoadingPlaces,
    isError: isPlacesError,
  } = useQuery<Place[]>({
    queryKey: queryKeys.places.byLocation(selectedLocation?.country, selectedLocation?.city),
    queryFn: () =>
      placeApiService.getPlacesByLocation(
        selectedLocation?.country ?? "",
        selectedLocation?.city ?? ""
      ),
    enabled: selectedLocation !== null && selectedLocation.country !== "" && selectedLocation.city !== "",
    staleTime: 5 * 60 * 1000,
  });

  const placesList = Array.isArray(placesAtLocation) ? placesAtLocation : [];

  const handleMarkerClick = (country: string, city: string) => {
    setSelectedLocation({ country, city });
  };

  const handleCloseModal = () => {
    setSelectedLocation(null);
  };

  const modalStyle = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: { xs: "85dvw", sm: "70dvw", md: "50dvw", lg: "30dvw" },
    maxWidth: { xs: "95dvw", sm: "85dvw", md: "70dvw", lg: "50dvw" },
    maxHeight: { xs: "85dvh", sm: "80dvh", md: "70dvh", lg: "80dvh" },
    bgcolor: "#3f3f41",
    borderRadius: 2,
    boxShadow: 24,
    p: 3,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden", // Prevent modal from overflowing
  };

  return (
    <>
      <Box
        sx={{
          width: { xs: "98dvw", md: "60dvw" },
          height: { xs: "75dvh", md: "60vh" },
          position: "relative",
          maxWidth: { md: "100%" },
          marginX: "auto",
        }}
      >
        <MapContainer
          center={defaultCenter}
          zoom={defaultZoom}
          style={{ height: "100%", width: "100%", borderRadius: "5px" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          {mapMarkers.map((marker) => (
            <Marker
              key={marker.key}
              position={[marker.latitude, marker.longitude]}
              icon={vinylIcon}
              eventHandlers={{
                click: () =>
                  handleMarkerClick(marker.country, marker.city),
              }}
            />
          ))}
        </MapContainer>

        {onAddPlace && (
          <Box
            sx={{
              position: "absolute",
              top: 16,
              right: 16,
              zIndex: 1000,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 0.5,
              pointerEvents: "auto",
            }}
          >
            <Fab
              color="primary"
              aria-label="add place"
              onClick={onAddPlace}
              sx={{
                backgroundColor: "#C9A726",
                "&:hover": { backgroundColor: "#B8961F" },
                animation: `${growItem} 1.3s infinite`,
                boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
              }}
            >
              <Add />
            </Fab>
            <Typography
              variant="caption"
              onClick={onAddPlace}
              sx={{
                color: "#fff",
                backgroundColor: "rgba(0,0,0,0.6)",
                borderRadius: 1,
                px: 1.5,
                py: 0.3,
                fontWeight: 600,
                letterSpacing: 0.3,
                cursor: "pointer",
                userSelect: "none",
                whiteSpace: "nowrap",
              }}
            >
              Add a place
            </Typography>
          </Box>
        )}
      </Box>

      {/* Places at Coordinates Modal with Accordion */}
      <Modal
        open={selectedLocation !== null}
        onClose={handleCloseModal}
        closeAfterTransition
        slots={{ backdrop: Backdrop }}
      >
        <Fade in={selectedLocation !== null}>
          <Box sx={modalStyle}>
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={2}
            >
              <Typography
                variant="h5"
                component="h2"
                sx={{ color: "#C9A726", fontWeight: "bold" }}
              >
                {selectedLocation
                  ? `🏙️ ${[selectedLocation.city, selectedLocation.country].filter(Boolean).join(", ") || "Places"}`
                  : "🏙️ Places"}
                {isLoadingPlaces && " (Loading...)"}
              </Typography>
              <IconButton onClick={handleCloseModal} size="small">
                <Close sx={{ color: "#C9A726" }} />
              </IconButton>
            </Box>

            {isLoadingPlaces ? (
              <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                minHeight="200px"
              >
                <CircularProgress sx={{ color: "#C9A726" }} />
              </Box>
            ) : isPlacesError ? (
              <Typography sx={{ color: "#e4e4e4" }}>
                Error loading places. Check your connection.
              </Typography>
            ) : placesList.length > 0 ? (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  overflow: "auto",
                  flex: 1,
                  pr: 1,
                }}
              >
                {placesList.map((place) => (
                  <Accordion
                    key={place.id}
                    sx={{
                      backgroundColor: "#2d2d2f",
                      color: "#fffbf9",
                      "&:before": {
                        display: "none",
                      },
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMore sx={{ color: "#C9A726" }} />}
                      sx={{
                        "& .MuiAccordionSummary-content": {
                          margin: "12px 0",
                        },
                      }}
                    >
                      <Typography
                        variant="h6"
                        sx={{
                          color: "#C9A726",
                          fontWeight: "bold",
                          fontSize: "1.1rem",
                        }}
                      >
                        🎯 {place.name}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ overflow: "hidden" }}>
                      <PlaceDetailsContent place={place} />
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            ) : (
              <Typography sx={{ color: "#fffbf9" }}>
                No places found at this location.
              </Typography>
            )}
          </Box>
        </Fade>
      </Modal>
    </>
  );
};

// Separate component for place details with like functionality
interface PlaceDetailsContentProps {
  place: Place;
}

const PlaceDetailsContent: React.FC<PlaceDetailsContentProps> = ({ place }) => {
  const [likeBounce, setLikeBounce] = useState(false);
  const [likeCooldown, setLikeCooldown] = useState(false);

  // is_liked and likes_count are driven by the React Query cache (optimistic update in usePlaceLike)
  const { like, unlike, isLiking, isUnliking } = usePlaceLike(place.id);

  React.useEffect(() => {
    setLikeBounce(true);
    const timeout = setTimeout(() => setLikeBounce(false), 350);
    return () => clearTimeout(timeout);
  }, [place.likes_count]);

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLiking || isUnliking || likeCooldown) return;
    setLikeCooldown(true);
    setTimeout(() => setLikeCooldown(false), 1000);
    if (place.is_liked) {
      unlike();
    } else {
      like();
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {place.address && (
        <Typography
          variant="body1"
          sx={{
            color: "#e4e4e4",
            fontSize: "1rem",
          }}
        >
          📍 {place.address}
          {place.city && place.country && `, ${place.city}, ${place.country}`}
        </Typography>
      )}

      {place.description && (
        <Typography
          variant="body1"
          sx={{
            color: "#fffbf9",
            fontSize: "1rem",
            lineHeight: 1.5,
          }}
        >
          {place.description}
        </Typography>
      )}

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          mt: 1,
          flexWrap: "wrap",
        }}
      >
        {place.place_type && (
          <Chip
            label={place.place_type.name}
            size="medium"
            sx={{
              backgroundColor: "#C9A726",
              color: "#fffbf9",
              fontSize: "0.9rem",
              fontWeight: "bold",
              padding: "8px 12px",
              "&:hover": {
                backgroundColor: "#b38f1f",
              },
            }}
          />
        )}
        <IconButton
          size="small"
          onClick={handleLikeClick}
          disabled={isLiking || isUnliking || likeCooldown}
          sx={{
            color: place.is_liked ? "#FFD700" : "#e4e4e4",
            transition: "transform 0.15s, color 0.15s",
            "&:hover": {
              transform: "scale(1.1)",
              color: "#FFD700",
            },
            "&:active": {
              transform: "scale(0.95)",
            },
          }}
        >
          {place.is_liked ? <Favorite /> : <FavoriteBorder />}
        </IconButton>
        {place.likes_count > 0 && (
          <Typography
            variant="body1"
            sx={{
              color: "#fffbf9",
              fontWeight: 600,
              fontSize: "1rem",
              transition: "transform 0.3s cubic-bezier(.68,-0.55,.27,1.55)",
              transform: likeBounce ? "scale(1.35)" : "scale(1)",
              display: "inline-block",
            }}
          >
            {place.likes_count}{" "}
            {place.likes_count === 1 ? "like" : "likes"}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default PlaceMap;
