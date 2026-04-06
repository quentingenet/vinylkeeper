import {
  Card,
  CardContent,
  CardMedia,
  IconButton,
  Typography,
  Box,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { Album } from "@mui/icons-material";
import { buildProxyImageUrl } from "@utils/ImageProxyHelper";
import { truncateText } from "@utils/GlobalUtils";
import styles from "../../styles/pages/Collection.module.scss";

interface MediaCardItem {
  title?: string;
  image_url?: string;
  entity_type?: string;
}

interface MediaCardProps {
  item: MediaCardItem;
  itemType: "album" | "artist" | "wishlist";
  onPlay: () => void;
  onDelete?: () => void;
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
