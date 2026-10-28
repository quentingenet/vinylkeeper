import {
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { colors } from "@styles/colors";

interface Track {
  position: string;
  title: string;
  duration: string;
}

interface TracklistAccordionProps {
  tracklist: Track[];
}

export default function TracklistAccordion({ tracklist }: TracklistAccordionProps) {
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
          Tracklist
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <List sx={{ maxHeight: 200, overflow: "auto", p: 0 }}>
          {tracklist.map((track, index) => (
            <ListItem key={index} sx={{ py: 0.5, px: 0 }}>
              <ListItemText
                primary={
                  <Typography sx={{ color: colors.textLight }}>
                    {track.position} {track.title}
                  </Typography>
                }
                secondary={
                  <Typography sx={{ color: colors.textMuted }}>
                    {track.duration}
                  </Typography>
                }
              />
            </ListItem>
          ))}
        </List>
      </AccordionDetails>
    </Accordion>
  );
}
