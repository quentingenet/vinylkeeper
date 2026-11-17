import {
  Alert,
  Box,
  Button,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useReplacePressing } from "@hooks/useReplacePressing";
import type { IAlbumRequestResults } from "@models/IRequestProxy";
import type { ReplaceTarget } from "@utils/findPressing";
import { colors } from "@styles/colors";
import { useTranslation } from "react-i18next";

interface ReplacePressingPanelProps {
  pressing: IAlbumRequestResults;
  target: ReplaceTarget;
  onDetails: () => void;
  onReplaced: () => void;
}

/** "Find my pressing": the pressing picked takes the place of the album in the collection. */
export default function ReplacePressingPanel({
  pressing,
  target,
  onDetails,
  onReplaced,
}: ReplacePressingPanelProps) {
  const { t } = useTranslation("records");
  const replacePressing = useReplacePressing(target);

  const confirm = () => {
    replacePressing
      .mutateAsync(pressing)
      .then(onReplaced)
      .catch(() => undefined);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        p: 2,
        backgroundColor: colors.panel,
        borderRadius: 1,
      }}
    >
      <Typography variant="body2" sx={{ color: "text.primary" }}>
        {target.title
          ? t("replace.willReplace", { title: target.title })
          : null}{" "}
        {t("replace.kept")}
      </Typography>
      {replacePressing.isError && (
        <Alert severity="error">
          {t("replace.failed")}
        </Alert>
      )}
      <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
        <Button
          variant="contained"
          onClick={confirm}
          disabled={replacePressing.isPending}
        >
          {t("replace.mine")}
        </Button>
        <Tooltip title={t("panel.albumDetails")}>
          <IconButton
            aria-label={t("panel.albumDetails")}
            onClick={onDetails}
            sx={{ color: "text.primary" }}
          >
            <InfoOutlinedIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
