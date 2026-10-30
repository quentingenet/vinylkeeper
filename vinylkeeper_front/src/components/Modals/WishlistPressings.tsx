import { Box, IconButton, List, ListItem, Tooltip, Typography } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import DoubleArrowIcon from "@mui/icons-material/DoubleArrow";
import type { WishlistPressing } from "@models/IExternalReference";
import EditionChips from "@components/Records/EditionChips";
import { GOT_IT_TOOLTIP, wantedPressingTitle } from "@components/Collections/wishlistLabels";

interface WishlistPressingsProps {
  pressings: WishlistPressing[];
  /** The owner of the wishlist: each pressing can be moved to a collection or removed */
  canEdit: boolean;
  onMove: (pressing: WishlistPressing) => void;
  onRemove: (pressing: WishlistPressing) => void;
}

/** The wanted pressings of a work, one line each, as the pressings of a collection record. */
export default function WishlistPressings({ pressings, canEdit, onMove, onRemove }: WishlistPressingsProps) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle1" sx={{ color: "primary.main", fontWeight: "bold", mb: 1 }}>
        {pressings.length} wanted pressings
      </Typography>
      <List disablePadding aria-label="Wanted pressings">
        {pressings.map((pressing, index) => (
          <ListItem
            key={pressing.id}
            disableGutters
            sx={{ gap: 1, alignItems: "center", borderBottom: 1, borderColor: "divider", py: 1 }}
            secondaryAction={
              canEdit && (
                <Box sx={{ display: "flex", gap: 0.5 }}>
                  <Tooltip title={GOT_IT_TOOLTIP}>
                    <IconButton aria-label={`Move ${wantedPressingTitle(pressing, index + 1)} to a collection`}
                      onClick={() => onMove(pressing)} sx={{ color: "text.primary" }}>
                      <DoubleArrowIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Remove this pressing from your wishlist">
                    <IconButton aria-label={`Remove ${wantedPressingTitle(pressing, index + 1)} from the wishlist`}
                      onClick={() => onRemove(pressing)} sx={{ color: "text.secondary" }}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              )
            }
          >
            <Box sx={{ pr: canEdit ? 12 : 0, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 600 }}>{wantedPressingTitle(pressing, index + 1)}</Typography>
              <EditionChips album={{ formats: pressing.formats }} centered={false} />
            </Box>
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
