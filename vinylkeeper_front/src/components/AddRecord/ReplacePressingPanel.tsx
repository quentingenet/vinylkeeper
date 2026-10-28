import { Alert, Box, Button, IconButton, Tooltip, Typography } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useReplacePressing } from "@hooks/useReplacePressing";
import type { IAlbumRequestResults } from "@models/IRequestProxy";
import type { ReplaceTarget } from "@utils/findPressing";

interface ReplacePressingPanelProps {
  pressing: IAlbumRequestResults;
  target: ReplaceTarget;
  onDetails: () => void;
  onReplaced: () => void;
}

/** "Find my pressing": the pressing picked takes the place of the album in the collection. */
export default function ReplacePressingPanel({ pressing, target, onDetails, onReplaced }: ReplacePressingPanelProps) {
  const replacePressing = useReplacePressing(target);

  const confirm = () => {
    replacePressing.mutateAsync(pressing).then(onReplaced).catch(() => undefined);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, p: 2, backgroundColor: "#2a2a2a", borderRadius: 1 }}>
      <Typography variant="body2" sx={{ color: "text.primary" }}>
        {target.title ? `It will replace the pressing of “${target.title}” in your collection.` : null} Your copies,
        their condition and the date you added it are kept.
      </Typography>
      {replacePressing.isError && <Alert severity="error">Could not replace the pressing. Please try again.</Alert>}
      <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
        <Button variant="contained" onClick={confirm} disabled={replacePressing.isPending}>
          This is my pressing
        </Button>
        <Tooltip title="View album details">
          <IconButton aria-label="View album details" onClick={onDetails} sx={{ color: "text.primary" }}>
            <InfoOutlinedIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
