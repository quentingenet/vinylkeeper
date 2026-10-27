import { useState } from "react";
import { Box } from "@mui/material";
import vinylKeeperImg from "@assets/vinylKeeper.svg";
import { buildProxyImageUrl } from "@utils/ImageProxyHelper";

export const MOSAIC_COVERS_COUNT = 6;
const MOSAIC_HEIGHT = 220;
// Cells are ~107×110px; request 2x for sharp covers on high-density screens
const COVER_PROXY_SIZE = 220;

interface CoverMosaicProps {
  images: string[];
}

/** All-or-nothing: the default artwork unless all 6 covers are usable and load. */
export default function CoverMosaic({ images }: CoverMosaicProps) {
  const [hasBrokenCover, setHasBrokenCover] = useState(false);

  const covers = images
    .map((src) => buildProxyImageUrl(src, COVER_PROXY_SIZE, COVER_PROXY_SIZE, 80, true))
    .filter((url) => url !== "")
    .slice(0, MOSAIC_COVERS_COUNT);

  if (hasBrokenCover || covers.length < MOSAIC_COVERS_COUNT) {
    return (
      <Box
        component="img"
        src={vinylKeeperImg}
        alt="vinyl disc"
        data-testid="cover-mosaic-fallback"
        sx={{
          display: "block",
          width: "100%",
          height: MOSAIC_HEIGHT,
          objectFit: "cover",
          borderTopLeftRadius: 4,
          borderTopRightRadius: 4,
          background: "#C9A726",
          opacity: 0.8,
        }}
      />
    );
  }

  return (
    <Box
      data-testid="cover-mosaic"
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gridTemplateRows: "repeat(2, 1fr)",
        width: "100%",
        height: MOSAIC_HEIGHT,
        overflow: "hidden",
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4,
        backgroundColor: "background.default",
      }}
    >
      {covers.map((src, index) => (
        <Box
          // Two albums can share the same cover URL
          key={`${index}-${src}`}
          component="img"
          src={src}
          // Decorative: the card title is the accessible name
          alt=""
          loading="lazy"
          onError={() => setHasBrokenCover(true)}
          sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ))}
    </Box>
  );
}
