import React, { useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import { Icon } from "leaflet";
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
} from "@mui/material";
import {
  Favorite,
  FavoriteBorder,
  Close,
  ExpandMore,
} from "@mui/icons-material";
import { usePlaceLike } from "@hooks/usePlaceLike";
import { useQuery } from "@tanstack/react-query";
import {
  placeApiService,
  Place,
  PlaceMapResponse,
} from "@services/PlaceApiService";
import "leaflet/dist/leaflet.css";

// Fix for default markers in React Leaflet
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

interface PlaceMapProps {
  mapPlaces: PlaceMapResponse[];
}

const PlaceMap: React.FC<PlaceMapProps> = ({ mapPlaces }) => {
  const defaultCenter: [number, number] = [48.8566, 2.3522]; // Paris
  const defaultZoom = 5;
  const [selectedCoordinates, setSelectedCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // Group places by coordinates (key: "lat,lng")
  const groupedPlaces = useMemo(() => {
    const groups = new Map<string, PlaceMapResponse[]>();
    mapPlaces.forEach((place) => {
      const key = `${place.latitude},${place.longitude}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(place);
    });
    return groups;
  }, [mapPlaces]);

  // Get unique coordinates for markers (one marker per coordinate)
  const uniqueCoordinates = useMemo(() => {
    return Array.from(groupedPlaces.entries()).map(([key, places]) => {
      const [lat, lng] = key.split(",").map(Number);
      // Get city from first place in the group (all places at same coordinates should be in same city)
      const city = places[0]?.city;
      return { latitude: lat, longitude: lng, key, places, city };
    });
  }, [groupedPlaces]);

  // Fetch all places at selected coordinates when a marker is clicked
  const { data: placesAtCoordinates, isLoading: isLoadingPlaces } = useQuery<
    Place[]
  >({
    queryKey: [
      "places-coordinates",
      selectedCoordinates?.latitude,
      selectedCoordinates?.longitude,
    ],
    queryFn: () =>
      placeApiService.getPlacesByCoordinates(
        selectedCoordinates!.latitude,
        selectedCoordinates!.longitude
      ),
    enabled: selectedCoordinates !== null,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleMarkerClick = (latitude: number, longitude: number) => {
    setSelectedCoordinates({ latitude, longitude });
  };

  const handleCloseModal = () => {
    setSelectedCoordinates(null);
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

          {/* One marker per unique coordinate */}
          {uniqueCoordinates.map((coord) => (
            <Marker
              key={coord.key}
              position={[coord.latitude, coord.longitude]}
              eventHandlers={{
                click: () => handleMarkerClick(coord.latitude, coord.longitude),
              }}
            />
          ))}
        </MapContainer>
      </Box>

      {/* Places at Coordinates Modal with Accordion */}
      <Modal
        open={selectedCoordinates !== null}
        onClose={handleCloseModal}
        closeAfterTransition
        slots={{ backdrop: Backdrop }}
      >
        <Fade in={selectedCoordinates !== null}>
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
                {isLoadingPlaces
                  ? "Loading..."
                  : placesAtCoordinates && placesAtCoordinates.length > 0
                  ? `🏙️ ${placesAtCoordinates[0].city || "Unknown city"}`
                  : "🏙️ Places at this location"}
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
            ) : placesAtCoordinates && placesAtCoordinates.length > 0 ? (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  overflow: "auto",
                  flex: 1,
                  pr: 1, // Padding right for scrollbar
                }}
              >
                {placesAtCoordinates.map((place) => (
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
  const [optimisticIsLiked, setOptimisticIsLiked] = useState(place.is_liked);
  const [optimisticLikesCount, setOptimisticLikesCount] = useState(
    place.likes_count
  );

  const handleError = (_error: Error) => {
    // Revert optimistic updates on error
    setOptimisticIsLiked(place.is_liked);
    setOptimisticLikesCount(place.likes_count);
  };

  const { like, unlike, isLiking, isUnliking, likeError, unlikeError } =
    usePlaceLike(place.id, handleError);

  // Update optimistic state when place changes
  React.useEffect(() => {
    setOptimisticIsLiked(place.is_liked ?? false);
    setOptimisticLikesCount(place.likes_count ?? 0);
  }, [place.id, place.is_liked, place.likes_count]);

  // Handle errors by reverting to previous state
  React.useEffect(() => {
    if (likeError || unlikeError) {
      setOptimisticIsLiked(place.is_liked);
      setOptimisticLikesCount(place.likes_count);
    }
  }, [likeError, unlikeError, place.is_liked, place.likes_count]);

  // Animation effect for likes count
  React.useEffect(() => {
    if (likeBounce) return;
    setLikeBounce(true);
    const timeout = setTimeout(() => setLikeBounce(false), 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optimisticLikesCount]);

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isLiking || isUnliking || likeCooldown) return;

    setLikeCooldown(true);
    setTimeout(() => setLikeCooldown(false), 1000);

    if (optimisticIsLiked) {
      setOptimisticIsLiked(false);
      setOptimisticLikesCount((prev) => Math.max(0, prev - 1));
      unlike();
    } else {
      setOptimisticIsLiked(true);
      setOptimisticLikesCount((prev) => prev + 1);
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
            color: optimisticIsLiked ? "#FFD700" : "#e4e4e4",
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
          {optimisticIsLiked ? <Favorite /> : <FavoriteBorder />}
        </IconButton>
        {optimisticLikesCount > 0 && (
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
            {optimisticLikesCount}{" "}
            {optimisticLikesCount === 1 ? "like" : "likes"}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default PlaceMap;
