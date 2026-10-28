import { Box, Chip } from "@mui/material";
import { editionChips, type Edition } from "./editionLabels";

interface EditionChipsProps {
  album: Edition;
  maxRows?: number;
  centered?: boolean;
}

const CHIP_ROW_HEIGHT_PX = 28;

export default function EditionChips({ album, maxRows, centered = true }: EditionChipsProps) {
  const chips = editionChips(album);
  if (chips.length === 0) return null;

  return (
    <Box
      sx={{
        // Bounded by the card: long chips get an ellipsis instead of overflowing
        width: "100%",
        display: "flex",
        flexWrap: "wrap",
        gap: 0.5,
        justifyContent: centered ? "center" : "flex-start",
        ...(maxRows && { maxHeight: maxRows * CHIP_ROW_HEIGHT_PX, overflow: "hidden" }),
      }}
    >
      {chips.map((chip) => (
        <Chip
          key={chip.key}
          label={chip.label}
          title={chip.label}
          size="small"
          variant="outlined"
          sx={{ maxWidth: "100%" }}
        />
      ))}
    </Box>
  );
}
