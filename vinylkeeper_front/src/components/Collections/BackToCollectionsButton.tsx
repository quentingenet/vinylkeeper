import { Button } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import {
  EGlobalUrls,
  COLLECTIONS_TAB_PARAM,
  COMMUNITY_TAB_VALUE,
  COMMUNITY_COLLECTIONS_URL,
} from "@utils/GlobalUrls";

interface BackToCollectionsButtonProps {
  isOwner: boolean;
}

/** The list the user came from, as set by the collections lists when opening a collection. */
function listCameFrom(state: unknown): string | null {
  const backTo = (state as { backTo?: unknown } | null)?.backTo;
  if (typeof backTo !== "string") return null;
  const isCollectionsList =
    backTo === EGlobalUrls.COLLECTIONS || backTo.startsWith(`${EGlobalUrls.COLLECTIONS}?`);
  return isCollectionsList ? backTo : null;
}

/**
 * Back to the collections list: the same tab, page and sort when opened from it,
 * otherwise (shared link, dashboard) the tab the collection belongs to.
 */
export default function BackToCollectionsButton({ isOwner }: BackToCollectionsButtonProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const backTo = listCameFrom(location.state);

  const toCommunity = backTo
    ? new URLSearchParams(backTo.split("?")[1] ?? "").get(COLLECTIONS_TAB_PARAM) === COMMUNITY_TAB_VALUE
    : !isOwner;
  const label = toCommunity ? "Community" : "My collections";
  const target = backTo ?? (toCommunity ? COMMUNITY_COLLECTIONS_URL : EGlobalUrls.COLLECTIONS);

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    // Opened from the list: a real back, so the browser and Android back button stay in step
    if (backTo && !event.metaKey && !event.ctrlKey && !event.shiftKey && event.button === 0) {
      event.preventDefault();
      void navigate(-1);
    }
  };

  return (
    <Button
      component={RouterLink}
      to={target}
      onClick={handleClick}
      variant="text"
      size="small"
      startIcon={<ArrowBackIcon fontSize="small" />}
      aria-label={`Back to ${label}`}
      sx={{
        minHeight: 44,
        mb: 1,
        ml: -1,
        paddingX: 1,
        textTransform: "none",
        color: "text.secondary",
        "&:hover": { color: "primary.main" },
      }}
    >
      {label}
    </Button>
  );
}
