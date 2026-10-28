import { Box, Card, CardActionArea, CardContent, CardMedia, Chip, Typography } from "@mui/material";
import type { SpinningNowAlbum } from "@models/ISpinningNow";
import { buildProxyImageUrl } from "@utils/ImageProxyHelper";
import vinylKeeperImg from "@assets/vinylKeeper.svg";
import { albumTitleOnly, formatMoodName } from "@components/SpinningNow/spinningNowLabels";

const COVER_SIZE = 300;

interface SpinningNowAlbumCardProps {
  album: SpinningNowAlbum;
  onPlay: (album: SpinningNowAlbum) => void;
}

export default function SpinningNowAlbumCard({ album, onPlay }: SpinningNowAlbumCardProps) {
  const cover = album.image_url ? buildProxyImageUrl(album.image_url, COVER_SIZE, COVER_SIZE, 85, true) : "";
  const title = albumTitleOnly(album.title);
  const collectionNames = album.collections.map((collection) => collection.name).join(", ");
  // A Set: the "Romantic" style and the "romantic" mood would otherwise show twice
  const tags = [
    ...new Set([
      ...(album.year ? [String(album.year)] : []),
      ...album.styles.slice(0, 2),
      ...album.moods.map(formatMoodName),
    ]),
  ];

  return (
    <Card sx={{ backgroundColor: "background.paper", height: "100%" }}>
      <CardActionArea
        onClick={() => onPlay(album)}
        aria-label={`Play ${title}${album.artist_name ? ` by ${album.artist_name}` : ""}`}
        sx={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "stretch" }}
      >
        <CardMedia
          component="img"
          image={cover || vinylKeeperImg}
          alt=""
          loading="lazy"
          sx={{ aspectRatio: "1 / 1", objectFit: "cover" }}
        />
        <CardContent sx={{ flexGrow: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: "bold", lineHeight: 1.2 }} noWrap title={title}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap gutterBottom>
            {album.artist_name}
          </Typography>
          {album.collections.length > 0 && (
            <Typography variant="caption" color="text.secondary" noWrap component="p" title={collectionNames}>
              In {collectionNames}
            </Typography>
          )}
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1 }}>
            {tags.map((tag) => (
              <Chip key={tag} label={tag} size="small" variant="outlined" />
            ))}
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
