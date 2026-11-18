import { useState, type MouseEvent } from "react";
import { IconButton, Tooltip } from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import AppMenu from "@components/UI/AppMenu";
import AppMenuItem from "@components/UI/AppMenuItem";
import ReportCollectionDialog from "@components/Collections/ReportCollectionDialog";
import { useTranslation } from "react-i18next";

interface CollectionReportMenuProps {
  collectionId: number;
  collectionName: string;
}

/**
 * A discreet "more" menu on the page of a public collection of someone else, with "Report abuse".
 * The page decides when it shows (logged in, not the owner, public collection).
 */
export default function CollectionReportMenu({ collectionId, collectionName }: CollectionReportMenuProps) {
  const { t } = useTranslation("collections");
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [reporting, setReporting] = useState(false);

  return (
    <>
      <Tooltip title={t("report.more")}>
        <IconButton
          size="small"
          aria-label={t("report.more")}
          aria-haspopup="menu"
          onClick={(event: MouseEvent<HTMLElement>) => setAnchor(event.currentTarget)}
          sx={{ color: "text.secondary" }}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <AppMenu anchorEl={anchor} onClose={() => setAnchor(null)}>
        <AppMenuItem
          label={t("report.action")}
          onClick={() => {
            setAnchor(null);
            setReporting(true);
          }}
        />
      </AppMenu>
      <ReportCollectionDialog
        open={reporting}
        onClose={() => setReporting(false)}
        collectionId={collectionId}
        collectionName={collectionName}
      />
    </>
  );
}
