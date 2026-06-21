import { Box } from "@mui/material";
import {
  type CollectionAlbumResponse,
  type CollectionArtistResponse,
} from "@services/CollectionApiService";
import MediaCard from "@components/Collections/MediaCard";
import PaginationWithEllipsis from "@components/UI/PaginationWithEllipsis";
import styles from "../../styles/pages/Collection.module.scss";

type CollectionItem = CollectionAlbumResponse | CollectionArtistResponse;

interface CollectionItemGridProps {
  items: CollectionItem[];
  itemType: "album" | "artist";
  onPlay: (item: CollectionItem) => void;
  onDelete?: (item: CollectionItem) => void;
  imageSize: { w: number; h: number; q: number };
  totalPages?: number;
  page?: number;
  onPageChange?: (page: number) => void;
  isMobile?: boolean;
}

export default function CollectionItemGrid({
  items,
  itemType,
  onPlay,
  onDelete,
  imageSize,
  totalPages,
  page,
  onPageChange,
  isMobile,
}: CollectionItemGridProps) {
  return (
    <>
      <div className={styles.resultsContainer}>
        {items.map((item) => (
          <MediaCard
            key={item.id}
            item={item}
            itemType={itemType}
            onPlay={() => onPlay(item)}
            onDelete={onDelete ? () => onDelete(item) : undefined}
            imageSize={imageSize}
          />
        ))}
      </div>
      {totalPages && totalPages > 1 && page && onPageChange && (
        <Box display="flex" justifyContent="center" mt={3}>
          <PaginationWithEllipsis
            count={totalPages}
            page={page}
            onChange={onPageChange}
            color="primary"
            size={isMobile ? "medium" : "large"}
          />
        </Box>
      )}
    </>
  );
}
