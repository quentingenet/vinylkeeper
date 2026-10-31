import { useState } from "react";
import { Box, Button, Collapse, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useAlbumMetadata } from "@services/MusicMetadataService";
import VinylSpinner from "@components/UI/VinylSpinner";
import { releasedLabel } from "@components/Records/pressingMarks";

interface PressingMoreInfoProps {
  // Discogs release of the pressing
  releaseId: string;
}

function Mark({ label, values }: { label: string; values: string[] }) {
  if (values.length === 0) return null;
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      {values.map((value) => (
        // Monospace: compared character by character with what is etched on the record
        <Typography key={value} variant="body2" sx={{ color: "text.primary", fontFamily: "monospace", wordBreak: "break-word" }}>
          {value}
        </Typography>
      ))}
    </Box>
  );
}

/** Barcode, matrix and release date of a pressing, loaded from Discogs only when asked for. */
export default function PressingMoreInfo({ releaseId }: PressingMoreInfoProps) {
  const [open, setOpen] = useState(false);
  const { data, isLoading, isError } = useAlbumMetadata(open ? { id: releaseId, artist: "", title: "" } : undefined);
  const released = releasedLabel(data?.released);
  const hasMarks = Boolean(released || data?.barcode || data?.matrix?.length);

  return (
    <Box mt={1}>
      <Button
        size="small"
        variant="text"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        endIcon={
          <ExpandMoreIcon sx={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
        }
        sx={{ textTransform: "none", px: 0.5, minHeight: 0 }}
      >
        More about this pressing
      </Button>
      <Collapse in={open} unmountOnExit>
        <Box display="flex" flexDirection="column" gap={1} mt={1} pl={0.5}>
          {isLoading ? (
            <VinylSpinner size={24} />
          ) : isError ? (
            <Typography variant="body2" color="error">
              Could not load the pressing details. Please try again.
            </Typography>
          ) : hasMarks ? (
            <>
              <Mark label="Released" values={released ? [released] : []} />
              <Mark label="Barcode" values={data?.barcode ? [data.barcode] : []} />
              <Mark label="Matrix / Runout" values={data?.matrix ?? []} />
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No more details on Discogs for this pressing.
            </Typography>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}
