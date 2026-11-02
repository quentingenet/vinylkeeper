import { Box, type Theme } from "@mui/material";
import type { SystemStyleObject } from "@mui/system";
import useDetectMobile from "@hooks/useDetectMobile";
import {
  COLLECTION_GRID_DESKTOP_COLUMNS,
  COLLECTION_GRID_GAP,
} from "@components/Collections/collectionGridLayout";

interface CollectionGridProps {
  children: React.ReactNode;
  sx?: SystemStyleObject<Theme>;
}

export default function CollectionGrid({ children, sx }: CollectionGridProps) {
  const { isMobile } = useDetectMobile();

  return (
    <Box
      sx={{
        display: isMobile ? "flex" : "grid",
        flexDirection: isMobile ? "column" : "row",
        flexWrap: isMobile ? "nowrap" : "wrap",
        gridTemplateColumns: isMobile ? "repeat(1, 1fr)" : `repeat(${COLLECTION_GRID_DESKTOP_COLUMNS}, 1fr)`,
        justifyContent: isMobile ? "center" : "flex-start",
        alignItems: isMobile ? "center" : "flex-start",
        gap: COLLECTION_GRID_GAP,
        marginY: isMobile ? 1 : 3,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}
