import { Box, Typography } from "@mui/material";
import { type WishlistItemResponse } from "@models/IExternalReference";
import MediaCard from "@components/Collections/MediaCard";
import PaginationWithEllipsis from "@components/UI/PaginationWithEllipsis";
import LoadingCenter from "@components/UI/LoadingCenter";
import EmptyState from "@components/UI/EmptyState";
import styles from "../../styles/pages/Collection.module.scss";

interface WishlistTabContentProps {
  isLoading: boolean;
  searchTerm: string;
  debouncedSearchTerm: string;
  items: WishlistItemResponse[];
  total: number;
  totalPages: number;
  page: number;
  onPageChange: (page: number) => void;
  onPlay: (item: WishlistItemResponse, type: "album" | "artist") => void;
  onDelete?: (item: WishlistItemResponse) => void;
}

export default function WishlistTabContent({
  isLoading,
  searchTerm,
  debouncedSearchTerm,
  items,
  total,
  totalPages,
  page,
  onPageChange,
  onPlay,
  onDelete,
}: WishlistTabContentProps) {
  if (isLoading) {
    return <LoadingCenter />;
  }

  if (searchTerm.trim() && searchTerm.length < 2) {
    return <EmptyState message="Please enter at least 2 characters to search." />;
  }

  if (debouncedSearchTerm.trim() && debouncedSearchTerm.length >= 2) {
    if (items.length === 0) {
      return <EmptyState message={`No wishlist items found matching "${debouncedSearchTerm}".`} />;
    }
    return (
      <>
        <Typography variant="h6" sx={{ mb: 2, color: "primary.main" }}>
          Search results for &ldquo;{debouncedSearchTerm}&rdquo; ({total} items)
        </Typography>
        <div className={styles.resultsContainer}>
          {items.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              itemType="wishlist"
              onPlay={() => onPlay(item, item.entity_type === "album" ? "album" : "artist")}
              onDelete={onDelete ? () => onDelete(item) : undefined}
              imageSize={{ w: 300, h: 300, q: 75 }}
            />
          ))}
        </div>
        {totalPages > 1 && (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
            <PaginationWithEllipsis count={totalPages} page={page} onChange={onPageChange} />
          </Box>
        )}
      </>
    );
  }

  if (items.length === 0) {
    return <EmptyState message="Your wishlist is empty." />;
  }

  return (
    <>
      <div className={styles.resultsContainer}>
        {items.map((item) => (
          <MediaCard
            key={item.id}
            item={item}
            itemType="wishlist"
            onPlay={() => onPlay(item, item.entity_type === "album" ? "album" : "artist")}
            onDelete={onDelete ? () => onDelete(item) : undefined}
            imageSize={{ w: 500, h: 500, q: 85 }}
          />
        ))}
      </div>
      {totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <PaginationWithEllipsis count={totalPages} page={page} onChange={onPageChange} />
        </Box>
      )}
    </>
  );
}
