import { useMemo } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  List,
  ListItemButton,
  Typography,
} from "@mui/material";
import { ChevronRight, ExpandMore } from "@mui/icons-material";
import type { PlaceMapResponse } from "@services/AtlasApiService";
import { groupSpotsByCountry } from "@components/Atlas/atlasSpotsGrouping";

const spotsLabel = (count: number) => `${count} spot${count === 1 ? "" : "s"}`;

interface AtlasSpotsByCountryProps {
  spots: PlaceMapResponse[];
  /** Opens the spots of a city, as a click on its marker does */
  onSelectCity: (country: string, city: string) => void;
}

/**
 * Under the map: every spot by country and city, readable without the map (and by search
 * engines: the details of a closed accordion stay in the page).
 */
export default function AtlasSpotsByCountry({ spots, onSelectCity }: AtlasSpotsByCountryProps) {
  const countries = useMemo(() => groupSpotsByCountry(spots), [spots]);
  if (countries.length === 0) return null;

  return (
    <Box
      component="section"
      aria-labelledby="atlas-spots-by-country"
      sx={{ width: { xs: "94dvw", md: "60dvw" }, maxWidth: "100%", mt: 4, mx: "auto" }}
    >
      <Typography id="atlas-spots-by-country" variant="h6" component="h2" sx={{ color: "primary.main", fontWeight: "bold", mb: 1.5 }}>
        Spots by country
      </Typography>
      {countries.map(({ country, count, cities }) => (
        <Accordion key={country} disableGutters sx={{ bgcolor: "background.paper", color: "text.primary" }}>
          <AccordionSummary expandIcon={<ExpandMore sx={{ color: "primary.main" }} />}>
            <Typography component="h3" sx={{ fontWeight: "bold", flex: 1 }}>
              {country}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mr: 1 }}>
              {spotsLabel(count)}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            <List disablePadding>
              {cities.map(({ city, spots: citySpots }) => (
                <ListItemButton
                  key={city}
                  onClick={() => onSelectCity(country, city)}
                  sx={{ borderRadius: 1, gap: 1.5, flexWrap: "wrap", alignItems: "center" }}
                >
                  <Typography sx={{ fontWeight: 600, minWidth: 110 }}>{city}</Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, flex: 1 }}>
                    {citySpots.map((spot) => (
                      <Chip
                        key={spot.id}
                        size="small"
                        variant="outlined"
                        label={spot.name}
                        title={spot.place_type ?? undefined}
                      />
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    {citySpots.length}
                  </Typography>
                  <ChevronRight sx={{ color: "primary.main" }} />
                </ListItemButton>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}
