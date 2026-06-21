import { Box, Typography, Button, Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { logger } from "@utils/logger";
import useDetectMobile from "@hooks/useDetectMobile";
import { musicStreamingService } from "@services/MusicStreamingService";

interface StreamingLinksAccordionProps {
  itemTitle: string;
  itemArtist: string;
  itemType: "album" | "artist";
}

export default function StreamingLinksAccordion({
  itemTitle,
  itemArtist,
  itemType,
}: StreamingLinksAccordionProps) {
  const { isMobile } = useDetectMobile();

  const handleRedirect = (platformName: string) => {
    const queryParts: string[] = [];
    if (itemType === "album") {
      if (itemArtist) queryParts.push(itemArtist);
      queryParts.push(itemTitle);
    } else {
      queryParts.push(itemTitle);
    }

    const searchQuery = encodeURIComponent(
      Array.from(new Set(queryParts)).join(" ")
    );

    let url = "";
    switch (platformName.toLowerCase()) {
      case "spotify":
        url = `${import.meta.env.VITE_SPOTIFY_WEB_URL}/${searchQuery}`;
        break;
      case "deezer":
        url = `${import.meta.env.VITE_DEEZER_WEB_URL}/${searchQuery}`;
        break;
      case "youtubemusic":
      case "youtube music":
        url = `${import.meta.env.VITE_YOUTUBE_MUSIC_URL}?q=${searchQuery}`;
        break;
      default:
        logger.warn("Unsupported platform:", platformName);
        return;
    }

    if (isMobile) {
      window.location.assign(url);
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
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
        },
        "& .MuiAccordionSummary-expandIconWrapper": { color: "#C9A726" },
        "& .MuiAccordionDetails-root": { backgroundColor: "#2a2a2a" },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle1" fontWeight="bold">
          Listen on
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box display="flex" flexDirection="column" gap={2}>
          {musicStreamingService.getPlatforms().map((platform) => (
            <Button
              key={platform.name}
              variant="contained"
              fullWidth
              onClick={() => handleRedirect(platform.name)}
              sx={{
                backgroundColor: "#1F1F1F",
                color: "#C9A726",
                "&:hover": { backgroundColor: "#C9A726", color: "#1F1F1F" },
                py: 1.5,
              }}
              startIcon={<span>{platform.icon}</span>}
            >
              Listen on {platform.name}
            </Button>
          ))}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}
