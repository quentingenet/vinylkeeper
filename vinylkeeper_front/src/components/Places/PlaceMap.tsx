import React, { useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import { Icon } from "leaflet";
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Modal,
  Fade,
  Backdrop,
} from "@mui/material";
import {
  Favorite,
  FavoriteBorder,
  ExpandMore,
  Close,
} from "@mui/icons-material";
import { usePlaceLike } from "@hooks/usePlaceLike";
import "leaflet/dist/leaflet.css";

// Fix for default markers in React Leaflet
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

interface Place {
  id: number;
  name: string;
  address?: string;
  city?: string;
  country?: string;
  latitude: number;
  longitude: number;
  description?: string;
  place_type: {
    name: string;
  };
  likes_count: number;
  is_liked?: boolean;
}

interface PlaceMapProps {
  places: Place[];
}

const PlaceMap: React.FC<PlaceMapProps> = ({ places }) => {
  const defaultCenter: [number, number] = [48.8566, 2.3522]; // Paris
  const defaultZoom = 5;
  const [selectedCity, setSelectedCity] = useState<{
    cityKey: string;
    places: Place[];
  } | null>(null);

  // Group places by city
  const placesByCity = useMemo(() => {
    const grouped: { [key: string]: Place[] } = {};

    places.forEach((place) => {
      if (place.city) {
        const cityKey = `${place.city}, ${place.country || "Unknown"}`;
        if (!grouped[cityKey]) {
          grouped[cityKey] = [];
        }
        grouped[cityKey].push(place);
      }
    });

    return grouped;
  }, [places]);

  // Calculate center point for each city
  const cityCenters = useMemo(() => {
    const centers: { [key: string]: [number, number] } = {};

    Object.entries(placesByCity).forEach(([cityKey, cityPlaces]) => {
      if (cityPlaces.length > 0) {
        const avgLat =
          cityPlaces.reduce((sum, place) => sum + place.latitude, 0) /
          cityPlaces.length;
        const avgLng =
          cityPlaces.reduce((sum, place) => sum + place.longitude, 0) /
          cityPlaces.length;
        centers[cityKey] = [avgLat, avgLng];
      }
    });

    return centers;
  }, [placesByCity]);

  const handleCityClick = (cityKey: string, cityPlaces: Place[]) => {
    setSelectedCity({ cityKey, places: cityPlaces });
  };

  const handleCloseModal = () => {
    setSelectedCity(null);
  };

  const modalStyle = {
    position: "absolute",
    top: "40%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: { xs: "85dvw", sm: "85dvw", md: "70dvw", lg: "25dvw" },
    maxWidth: { xs: "95dvw", sm: "85dvw", md: "70dvw", lg: "60dvw" },
    maxHeight: { xs: "85dvh", sm: "80dvh", md: "70dvh", lg: "80dvh" },
    bgcolor: "#3f3f41",
    borderRadius: 2,
    boxShadow: 24,
    p: 3,
    display: "flex",
    flexDirection: "column",
  };

  return (
    <>
      <Box
        sx={{
          width: "80dvw",
          height: { xs: "60dvh", md: "60vh" },
          position: "relative",
          maxWidth: { md: "100%" },
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

          {/* City markers */}
          {Object.entries(placesByCity).map(([cityKey, cityPlaces]) => {
            const center = cityCenters[cityKey];
            if (!center) return null;

            return (
              <Marker
                key={`city-${cityKey}`}
                position={center}
                eventHandlers={{
                  click: () => handleCityClick(cityKey, cityPlaces),
                }}
              />
            );
          })}
        </MapContainer>
      </Box>

      {/* City Modal */}
      <Modal
        open={!!selectedCity}
        onClose={handleCloseModal}
        closeAfterTransition
        slots={{ backdrop: Backdrop }}
      >
        <Fade in={!!selectedCity}>
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
                🏙️ {selectedCity?.cityKey}
              </Typography>
              <IconButton onClick={handleCloseModal} size="small">
                <Close sx={{ color: "#fffbf9" }} />
              </IconButton>
            </Box>

            <Typography
              variant="body1"
              sx={{
                mb: 3,
                color: "#e4e4e4",
                textAlign: "center",
              }}
            >
              {selectedCity?.places.length} place
              {selectedCity?.places.length !== 1 ? "s" : ""} found
            </Typography>

            <Box
              sx={{
                flex: 1,
                overflowY: "auto",
                width: "100%",
                pr: 1, // Add padding right for scrollbar space
              }}
            >
              {selectedCity?.places.map((place) => (
                <PlaceAccordionItem key={place.id} place={place} />
              ))}
            </Box>
          </Box>
        </Fade>
      </Modal>
    </>
  );
};

// Separate component for place accordion item with like functionality
interface PlaceAccordionItemProps {
  place: Place;
}

const PlaceAccordionItem: React.FC<PlaceAccordionItemProps> = ({ place }) => {
  const [likeBounce, setLikeBounce] = useState(false);
  const [optimisticIsLiked, setOptimisticIsLiked] = useState(place.is_liked);
  const [optimisticLikesCount, setOptimisticLikesCount] = useState(
    place.likes_count
  );

  const handleError = (_error: Error) => {
    // Revert optimistic updates on error
    setOptimisticIsLiked(place.is_liked);
    setOptimisticLikesCount(place.likes_count);
  };

  const { like, unlike, isLiking, isUnliking } = usePlaceLike(
    place.id,
    handleError
  );

  // Update optimistic state when place data changes
  React.useEffect(() => {
    setOptimisticIsLiked(place.is_liked);
    setOptimisticLikesCount(place.likes_count);
  }, [place.is_liked, place.likes_count, place.id]);

  // Animation effect for likes count
  React.useEffect(() => {
    if (likeBounce) return;
    setLikeBounce(true);
    const timeout = setTimeout(() => setLikeBounce(false), 350);
    return () => clearTimeout(timeout);
  }, [optimisticLikesCount]);

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Prevent multiple clicks while processing
    if (isLiking || isUnliking) return;

    if (optimisticIsLiked) {
      // Optimistic update for unlike
      setOptimisticIsLiked(false);
      setOptimisticLikesCount((prev) => Math.max(0, prev - 1));
      unlike();
    } else {
      // Optimistic update for like
      setOptimisticIsLiked(true);
      setOptimisticLikesCount((prev) => prev + 1);
      like();
    }
  };

  return (
    <Accordion
      sx={{
        backgroundColor: "#3f3f41",
        color: "#fffbf9",
        mb: 2,
        "&:before": { display: "none" },
        "& .MuiAccordionSummary-root": {
          backgroundColor: "#1F1F1F",
          color: "#C9A726",
          fontWeight: "bold",
          minHeight: "56px",
        },
        "& .MuiAccordionSummary-expandIconWrapper": {
          color: "#C9A726",
        },
        "& .MuiAccordionDetails-root": {
          backgroundColor: "#2a2a2a",
          padding: "16px",
        },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}
        >
          <Typography variant="h6" fontWeight="bold">
            {place.name}
          </Typography>
          <IconButton
            size="small"
            onClick={handleLikeClick}
            disabled={isLiking || isUnliking}
            sx={{
              color: optimisticIsLiked ? "#FFD700" : "#e4e4e4",
              transition: "transform 0.15s, color 0.15s",
              "&:hover": {
                transform: "scale(1.15)",
                color: "#FFD700",
              },
              "&:active": {
                transform: "scale(0.95)",
              },
            }}
          >
            {optimisticIsLiked ? <Favorite /> : <FavoriteBorder />}
          </IconButton>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
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
                +{optimisticLikesCount}{" "}
                {optimisticLikesCount === 1 ? "like" : "likes"}
              </Typography>
            )}
          </Box>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};

export default PlaceMap;
