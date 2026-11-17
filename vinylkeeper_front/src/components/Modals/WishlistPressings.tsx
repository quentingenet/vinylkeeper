import { Box, IconButton, List, ListItem, Tooltip, Typography } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import DoubleArrowIcon from "@mui/icons-material/DoubleArrow";
import type { WishlistPressing } from "@models/IExternalReference";
import EditionChips from "@components/Records/EditionChips";
import { GOT_IT_TOOLTIP, wantedPressingTitle } from "@components/Collections/wishlistLabels";
import { useTranslation } from "react-i18next";

interface WishlistPressingsProps {
  pressings: WishlistPressing[];
  /** The owner of the wishlist: each pressing can be moved to a collection or removed */
  canEdit: boolean;
  onMove: (pressing: WishlistPressing) => void;
  onRemove: (pressing: WishlistPressing) => void;
}

/** The wanted pressings of a work, one line each, as the pressings of a collection record. */
export default function WishlistPressings({ pressings, canEdit, onMove, onRemove }: WishlistPressingsProps) {
  const { t } = useTranslation("collections");
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle1" sx={{ color: "primary.main", fontWeight: "bold", mb: 1 }}>
        {t("wishlist.wantedPressings", { count: pressings.length })}
      </Typography>
      <List disablePadding aria-label={t("wishlist.wantedLabel")}>
        {pressings.map((pressing, index) => (
          <ListItem
            key={pressing.id}
            disableGutters
            sx={{ gap: 1, alignItems: "center", borderBottom: 1, borderColor: "divider", py: 1 }}
            secondaryAction={
              canEdit && (
                <Box sx={{ display: "flex", gap: 0.5 }}>
                  <Tooltip title={t(GOT_IT_TOOLTIP)}>
                    <IconButton aria-label={t("wishlist.moveAria", { title: wantedPressingTitle(pressing, index + 1) })}
                      onClick={() => onMove(pressing)} sx={{ color: "text.primary" }}>
                      <DoubleArrowIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t("wishlist.removeTooltip")}>
                    <IconButton aria-label={t("wishlist.removeAria", { title: wantedPressingTitle(pressing, index + 1) })}
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
