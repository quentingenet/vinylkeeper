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
          Tracklist
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <List sx={{ maxHeight: 200, overflow: "auto", p: 0 }}>
          {tracklist.map((track, index) => (
            <ListItem key={index} sx={{ py: 0.5, px: 0 }}>
              <ListItemText
                primary={
                  <Typography sx={{ color: "#fffbf9" }}>
                    {track.position} {track.title}
                  </Typography>
                }
                secondary={
                  <Typography sx={{ color: "#e4e4e4" }}>
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
