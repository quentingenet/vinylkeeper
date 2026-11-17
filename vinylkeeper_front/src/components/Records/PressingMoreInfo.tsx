import { useState } from "react";
import { Box, Button, Collapse, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useAlbumMetadata } from "@services/MusicMetadataService";
import VinylSpinner from "@components/UI/VinylSpinner";
import { releasedLabel } from "@components/Records/pressingMarks";
import { useTranslation } from "react-i18next";

interface PressingMoreInfoProps {
  // Discogs release of the pressing
  releaseId: string;
}

function Mark({ label, values }: { label: string; values: string[] }) {
  if (values.length === 0) return null;
  return (
    <Box>
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
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
  const { t } = useTranslation("records");
  const [open, setOpen] = useState(false);
  const { data, isLoading, isError } = useAlbumMetadata(open ? { id: releaseId, artist: "", title: "" } : undefined);
  const released = releasedLabel(data?.released);
  const hasMarks = Boolean(released || data?.barcode || data?.matrix?.length);

  return (
    <Box sx={{ mt: 1 }}>
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
        {t("more.title")}
      </Button>
      <Collapse in={open} unmountOnExit>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 1, pl: 0.5 }}>
          {isLoading ? (
            <VinylSpinner size={24} />
          ) : isError ? (
            <Typography variant="body2" color="error">
              {t("more.failed")}
            </Typography>
          ) : hasMarks ? (
            <>
              <Mark label={t("more.released")} values={released ? [released] : []} />
              <Mark label={t("more.barcode")} values={data?.barcode ? [data.barcode] : []} />
              <Mark label={t("more.matrix")} values={data?.matrix ?? []} />
            </>
          ) : (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {t("more.none")}
            </Typography>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}
