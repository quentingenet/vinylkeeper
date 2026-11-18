import {
  Card,
  CardContent,
  CardMedia,
  IconButton,
  Typography,
  Box,
  Tooltip,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import DoubleArrowIcon from "@mui/icons-material/DoubleArrow";
import { ARTIST_TO_COLLECTION_TOOLTIP, GOT_IT_TOOLTIP } from "@components/Collections/wishlistLabels";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { Album } from "@mui/icons-material";
import { buildProxyImageUrl } from "@utils/ImageProxyHelper";
import { fadeInImageStyle, revealImage } from "@utils/ImageFadeIn";
import styles from "../../styles/pages/Collection.module.scss";
import { colors } from "@styles/colors";
import { useTranslation } from "react-i18next";
import { useCompactCards } from "@components/Collections/compactCards";

interface MediaCardItem {
  title?: string;
  image_url?: string;
  entity_type?: string;
  // Copies of the record in the collection, shown as "×3" on the cover above one
  copies_count?: number;
  // Wishlist: wanted pressings of the work, shown the same way
  pressings_count?: number;
}

interface MediaCardProps {
  item: MediaCardItem;
  itemType: "album" | "artist" | "wishlist";
  onPlay: () => void;
  onDelete?: () => void;
  /** Wishlist: the user got this record, into one of their collections */
  onGotIt?: () => void;
  imageSize?: { w: number; h: number; q: number };
}

// Two cards per row on a phone (CardGrid): everything is drawn smaller, the cover keeps its square
const COMPACT = { button: "28px", icon: "16px", titleSize: "1rem", subtitleSize: "0.8rem", badgeSize: "0.75rem" };

const iconButtonSx = {
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  width: "32px",
  height: "32px",
  p: 0,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.7)" },
};

export default function MediaCard({
  item,
  itemType,
  onPlay,
  onDelete,
  onGotIt,
  imageSize = { w: 300, h: 300, q: 75 },
}: MediaCardProps) {
  const compact = useCompactCards();
  const buttonSx = compact ? { ...iconButtonSx, width: COMPACT.button, height: COMPACT.button } : iconButtonSx;
  const buttonIconSx = { color: "white", fontSize: compact ? COMPACT.icon : "20px" };
  // A square cover as wide as the card, instead of 250px high
  const coverSx = compact ? { width: "100%", height: "auto", aspectRatio: "1 / 1" } : { height: 250 };
  const { t } = useTranslation("collections");
  const title = item.title || "";
  // Albums are stored as "Artist - Title": artist on the first line, the rest on the second.
  // Only the first separator splits, titles keep their own dashes ("Trust - Live - Paris By Night").
  const isAlbum = itemType === "album" || (itemType === "wishlist" && item.entity_type === "album");
  const separator = title.indexOf(" - ");
  const titleLine1 = isAlbum && separator > 0 ? title.slice(0, separator) : title;
  const titleLine2 = isAlbum ? (separator > 0 ? title.slice(separator + 3) : title) : null;

  // Copies in a collection, or wanted pressings in the wishlist
  const badgeCount = item.copies_count ?? item.pressings_count ?? 1;

  const entityBadge =
    itemType === "wishlist"
      ? item.entity_type === "album"
        ? "Album"
        : "Artist"
      : null;

  return (
    <Card
      onClick={onPlay}
      className={styles.resultCard}
      sx={{
        width: compact ? "100%" : 250,
        height: compact ? "100%" : 350,
        borderRadius: "8px",
        cursor: "pointer",
        position: "relative",
        transition: "transform 0.2s ease-in-out",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: compact ? 6 : 10,
          right: compact ? 6 : 10,
          display: "flex",
          flexDirection: "row",
          gap: 1,
          zIndex: 2,
        }}
      >
        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            onPlay();
          }}
          sx={buttonSx}
        >
          <PlayArrowIcon sx={buttonIconSx} />
        </IconButton>
        {onGotIt && (
          <Tooltip title={t(item.entity_type === "artist" ? ARTIST_TO_COLLECTION_TOOLTIP : GOT_IT_TOOLTIP)}>
            <IconButton
              aria-label={t("media.moveToCollection")}
              onClick={(e) => {
                e.stopPropagation();
                onGotIt();
              }}
              sx={buttonSx}
            >
              <DoubleArrowIcon sx={buttonIconSx} />
            </IconButton>
          </Tooltip>
        )}
        {onDelete && (
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            sx={buttonSx}
            aria-label={t("media.delete")}
          >
            <DeleteIcon sx={buttonIconSx} />
          </IconButton>
        )}
      </Box>

      {badgeCount > 1 && (
        <Box
          aria-label={item.copies_count ? t("media.copies", { count: badgeCount }) : t("media.pressings", { count: badgeCount })}
          sx={{
            position: "absolute",
            top: compact ? 6 : 10,
            left: compact ? 6 : 10,
            zIndex: 2,
            px: 1,
            py: 0.25,
            borderRadius: "12px",
            backgroundColor: "primary.main",
            color: colors.deep,
            fontWeight: "bold",
            fontSize: compact ? COMPACT.badgeSize : "0.9rem",
          }}
        >
          ×{badgeCount}
        </Box>
      )}

      {item.image_url ? (
        <CardMedia
          key={item.image_url}
          component="img"
          onLoad={revealImage}
          sx={{ ...fadeInImageStyle, ...coverSx, objectFit: "contain" }}
          image={
            buildProxyImageUrl(
              item.image_url,
              imageSize.w,
              imageSize.h,
              imageSize.q,
              true
            ) || undefined
          }
          alt={item.title}
        />
      ) : (
        <Box
          sx={{
            ...coverSx,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Album sx={{ opacity: 0.7, width: compact ? "55%" : 150, height: compact ? "55%" : 150, color: "primary.main" }} />
        </Box>
      )}

      {/* The 100px under the cover: an album takes one line for its artist and one for its title,
          an artist up to two lines for its name; the browser cuts what is longer with an ellipsis */}
      <CardContent
        title={title}
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          flex: 1,
          minHeight: 0,
          width: "100%",
          // The padding stays inside the card width, or the centered content overflows both sides
          boxSizing: "border-box",
          px: compact ? 1 : 2.5,
          py: compact ? 1 : 1.25,
          "&:last-child": { pb: compact ? 1 : 1.25 },
          gap: compact ? 0.25 : 0.5,
        }}
      >
        <Typography
          sx={{
            fontSize: compact ? COMPACT.titleSize : "1.4rem",
            textAlign: "center",
            color: "primary.main",
            fontWeight: "bold",
            lineHeight: 1.2,
            width: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            ...(titleLine2 !== null
              ? { whiteSpace: "nowrap" }
              : { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }),
          }}
        >
          {titleLine1}
        </Typography>
        {titleLine2 !== null && (
          <Typography
            variant="h6"
            sx={{
              fontSize: compact ? COMPACT.subtitleSize : "1rem",
              textAlign: "center",
              lineHeight: 1.2,
              width: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {titleLine2}
          </Typography>
        )}
        {entityBadge !== null && (
          <Typography
            sx={{ fontSize: compact ? COMPACT.subtitleSize : "0.9rem", textAlign: "center", color: "text.secondary" }}
          >
            {entityBadge}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
