import { useState, type MouseEvent } from "react";
import {
  Alert,
  Box,
  Button,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Snackbar,
  Tooltip,
  type Theme,
} from "@mui/material";
import type { SystemStyleObject } from "@mui/system";
import ShareIcon from "@mui/icons-material/Share";
import LinkIcon from "@mui/icons-material/Link";
import EmailIcon from "@mui/icons-material/Email";
import useDetectMobile from "@hooks/useDetectMobile";
import { SITE_URL } from "@hooks/usePageMeta";
import {
  collectionActionButtonSx,
  collectionMenuPaperSx,
  desktopMenuTextSx,
} from "@components/Collections/collectionMenuStyles";
import { sharedCollectionUrl } from "@utils/GlobalUrls";

interface ShareCollectionButtonProps {
  shareToken?: string | null;
  name: string;
  ownerUsername?: string | null;
  isPublic: boolean;
  /** "text": next to Export to, on the page of a collection. "icon": on a card */
  variant?: "icon" | "text";
  /** Where the button sits: on a card, in the corner opposite to the like button */
  sx?: SystemStyleObject<Theme>;
}

const SHARE_LABEL = "Share this collection";
const PRIVATE_LABEL = "Go public to share this collection with diggers\nall around the world, on Vinyl Keeper or not";

/** The link of a public collection: it opens for anyone, without an account. */
export default function ShareCollectionButton({
  shareToken,
  name,
  ownerUsername,
  isPublic,
  variant = "icon",
  sx,
}: ShareCollectionButtonProps) {
  const { isMobile } = useDetectMobile();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const canShare = isPublic && !!shareToken;
  const url = `${SITE_URL}${sharedCollectionUrl(shareToken ?? "")}`;
  const text = ownerUsername
    ? `Have a look at ${ownerUsername}'s collection and discover vinylkeeper.org`
    : "Have a look at this collection and discover vinylkeeper.org";

  const handleClick = async (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    const button = event.currentTarget;
    // On a phone: the share sheet of the system, with the apps of the phone
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: name, text, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    setAnchorEl(button);
  };

  const copyLink = async () => {
    setAnchorEl(null);
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Link copied");
    } catch {
      setMessage("The link could not be copied");
    }
  };

  const openEmail = () => {
    setAnchorEl(null);
    const target = `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(url)}`;
    window.open(target, "_blank", "noopener,noreferrer");
  };

  const options = [
    { label: "Copy link", Icon: LinkIcon, action: () => void copyLink() },
    { label: "Email", Icon: EmailIcon, action: openEmail },
  ];

  return (
    <>
      <Tooltip
        title={canShare ? SHARE_LABEL : PRIVATE_LABEL}
        enterTouchDelay={0}
        slotProps={{ tooltip: { sx: { whiteSpace: "pre-line" } } }}
      >
        {/* A span: a disabled button receives no event, its tooltip would never show */}
        <Box component="span" sx={{ display: "inline-flex", ...sx }}>
          {variant === "text" ? (
            <Button
              variant="text"
              size="small"
              startIcon={<ShareIcon fontSize="small" />}
              disabled={!canShare}
              onClick={(event) => void handleClick(event)}
              sx={collectionActionButtonSx}
            >
              Share
            </Button>
          ) : (
            <IconButton
              aria-label={canShare ? SHARE_LABEL : PRIVATE_LABEL.replace("\n", " ")}
              disabled={!canShare}
              onClick={(event) => void handleClick(event)}
              sx={{
                color: "primary.main",
                background: "rgba(30,30,30,0.5)",
                transition: "transform 0.15s, background 0.15s",
                "&:hover": { background: "rgba(30,30,30,0.7)", transform: "scale(1.15)" },
                "&:active": { transform: "scale(0.95)" },
                "&.Mui-disabled": { color: "grey.600", background: "rgba(30,30,30,0.5)" },
              }}
            >
              <ShareIcon sx={{ fontSize: "30px" }} />
            </IconButton>
          )}
        </Box>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        slotProps={{ paper: { sx: collectionMenuPaperSx(isMobile) }, list: { dense: true } }}
      >
        {options.map(({ label, Icon, action }) => (
          <MenuItem key={label} onClick={action}>
            <ListItemIcon sx={{ minWidth: 28 }}>
              <Icon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={label}
              // On the component itself: wins over the ListItemText size of the theme
              sx={isMobile ? undefined : { "& .MuiListItemText-primary": desktopMenuTextSx }}
              slotProps={{ primary: { variant: "caption" } }}
            />
          </MenuItem>
        ))}
      </Menu>
      <Snackbar open={message !== null} autoHideDuration={3000} onClose={() => setMessage(null)}>
        <Alert severity="info" onClose={() => setMessage(null)}>
          {message}
        </Alert>
      </Snackbar>
    </>
  );
}
