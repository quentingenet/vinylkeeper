import { Box, Typography, Button, Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import useDetectMobile from "@hooks/useDetectMobile";
import { streamingHref, streamingPlatforms, streamingQuery } from "@services/MusicStreamingService";
import { isCapacitorPlatform } from "@utils/CapacitorUtils";
import { colors } from "@styles/colors";

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
  const query = streamingQuery(itemTitle, itemArtist, itemType);
  // Intent links are for mobile browsers: the WebView of the native app does not open them
  const userAgent = isCapacitorPlatform() ? "" : navigator.userAgent;

  return (
    <Accordion
      sx={{
        backgroundColor: colors.surface,
        color: colors.textLight,
        mb: 2,
        "&:before": { display: "none" },
        "& .MuiAccordionSummary-root": {
          backgroundColor: colors.deep,
          color: "primary.main",
          fontWeight: "bold",
        },
        "& .MuiAccordionSummary-expandIconWrapper": { color: "primary.main" },
        "& .MuiAccordionDetails-root": { backgroundColor: colors.panel },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle1" fontWeight="bold">
          Listen on
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box display="flex" flexDirection="column" gap={2}>
          {streamingPlatforms.map((platform) => (
            // A real link: phones open the installed app on a tap, not on a script navigation
            <Button
              key={platform.name}
              component="a"
              href={streamingHref(platform, query, userAgent)}
              {...(!isMobile && { target: "_blank", rel: "noopener noreferrer" })}
              variant="contained"
              fullWidth
              sx={{
                backgroundColor: colors.deep,
                color: "primary.main",
                "&:hover": { backgroundColor: "primary.main", color: colors.deep },
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
