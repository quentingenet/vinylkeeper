import { Box, Button, Typography } from "@mui/material";
import EditionChips from "@components/AddVinyls/EditionChips";
import { hasEdition, type Edition } from "@components/AddVinyls/editionLabels";

interface PressingSectionProps {
  edition: Edition;
  // undefined outside a collection: the pressing of a search result is a plain fact
  confirmed?: boolean;
  canConfirm?: boolean;
  isConfirming?: boolean;
  onConfirm?: () => void;
  // Opens the search on this album to pick the pressing actually owned
  onFindPressing?: () => void;
}

export default function PressingSection({
  edition,
  confirmed,
  canConfirm = false,
  isConfirming = false,
  onConfirm,
  onFindPressing,
}: PressingSectionProps) {
  if (!hasEdition(edition)) return null;

  return (
    <Box mb={3}>
      <Typography variant="subtitle1" sx={{ color: "primary.main", mb: 1 }}>
        Pressing
      </Typography>
      <EditionChips album={edition} centered={false} />
      {confirmed === false && (
        <Box mt={1.5}>
          <Typography variant="body2" color="text.secondary">
            {canConfirm
              ? "Added before pressings were shown in search results. Is this your copy?"
              : "Pressing not confirmed by the owner."}
          </Typography>
          {canConfirm && (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
              {onConfirm && (
                <Button size="small" variant="outlined" onClick={onConfirm} disabled={isConfirming}>
                  Yes, this is my pressing
                </Button>
              )}
              {onFindPressing && (
                <Button size="small" variant="text" onClick={onFindPressing} disabled={isConfirming}>
                  No, find my pressing
                </Button>
              )}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
