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
import { truncateText } from "@utils/GlobalUtils";
import styles from "../../styles/pages/Collection.module.scss";
import { colors } from "@styles/colors";

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
  const titleLine1 =
    itemType === "album"
      ? truncateText(item.title?.split(" - ")[0] || "", 20)
      : truncateText(item.title || "", 20);

  const titleLine2 =
    itemType === "album"
      ? truncateText(item.title?.split(" - ")[1] || item.title || "", 20)
      : null;

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
        width: 250,
        height: 350,
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
          top: 10,
          right: 10,
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
          sx={iconButtonSx}
        >
          <PlayArrowIcon sx={{ color: "white", fontSize: "20px" }} />
        </IconButton>
        {onGotIt && (
          <Tooltip title={item.entity_type === "artist" ? ARTIST_TO_COLLECTION_TOOLTIP : GOT_IT_TOOLTIP}>
            <IconButton
              aria-label="Move to a collection"
              onClick={(e) => {
                e.stopPropagation();
                onGotIt();
              }}
              sx={iconButtonSx}
            >
              <DoubleArrowIcon sx={{ color: "white", fontSize: "20px" }} />
            </IconButton>
          </Tooltip>
        )}
        {onDelete && (
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            sx={iconButtonSx}
          >
            <DeleteIcon sx={{ color: "white", fontSize: "20px" }} />
          </IconButton>
        )}
      </Box>

      {badgeCount > 1 && (
        <Box
          aria-label={item.copies_count ? `${badgeCount} copies` : `${badgeCount} pressings`}
          sx={{
            position: "absolute",
            top: 10,
            left: 10,
            zIndex: 2,
            px: 1,
            py: 0.25,
            borderRadius: "12px",
            backgroundColor: "primary.main",
            color: colors.deep,
            fontWeight: "bold",
            fontSize: "0.9rem",
          }}
        >
          ×{badgeCount}
        </Box>
      )}

      {item.image_url ? (
        <CardMedia
          component="img"
          height={250}
          sx={{ objectFit: "contain" }}
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
            height: 250,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Album sx={{ opacity: 0.7, width: 150, height: 150, color: "primary.main" }} />
        </Box>
      )}

      <CardContent
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "80px",
          gap: 0.5,
        }}
      >
        <Typography
          sx={{
            fontSize: "1.4rem",
            textAlign: "center",
            color: "primary.main",
            fontWeight: "bold",
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            lineHeight: 1.2,
            height: "2.4em",
            width: "100%",
          }}
        >
          {titleLine1}
        </Typography>
        {titleLine2 !== null && (
          <Typography
            variant="h6"
            sx={{
              fontSize: "1rem",
              textAlign: "center",
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              lineHeight: 1.2,
              height: "2.4em",
              width: "100%",
            }}
          >
            {titleLine2}
          </Typography>
        )}
        {entityBadge !== null && (
          <Typography
            sx={{ fontSize: "0.9rem", textAlign: "center", color: "text.secondary" }}
          >
            {entityBadge}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
