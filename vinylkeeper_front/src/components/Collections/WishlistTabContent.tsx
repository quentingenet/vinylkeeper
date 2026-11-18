import { Box, Typography } from "@mui/material";
import { type WishlistItemResponse } from "@models/IExternalReference";
import MediaCard from "@components/Collections/MediaCard";
import PaginationWithEllipsis from "@components/UI/PaginationWithEllipsis";
import LoadingCenter from "@components/UI/LoadingCenter";
import EmptyState from "@components/UI/EmptyState";
import CardGrid from "@components/Collections/CardGrid";
import { useTranslation } from "react-i18next";

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
  /** Owner only: the record of a single-pressing card, or an artist, goes into a collection */
  onGotIt?: (item: WishlistItemResponse) => void;
}

/**
 * As in the collections: a card of several pressings is never removed (nor moved) at once,
 * its popup lists them, one action each.
 */
const isSinglePressing = (item: WishlistItemResponse) => (item.pressings_count ?? 1) <= 1;

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
  onGotIt,
}: WishlistTabContentProps) {
  const { t } = useTranslation("collections");
  if (isLoading) {
    return <LoadingCenter />;
  }

  if (searchTerm.trim() && searchTerm.length < 2) {
    return <EmptyState message={t("wishlist.minChars")} />;
  }

  if (debouncedSearchTerm.trim() && debouncedSearchTerm.length >= 2) {
    if (items.length === 0) {
      return <EmptyState message={t("wishlist.noMatch", { term: debouncedSearchTerm })} />;
    }
    return (
      <>
        <Typography variant="h6" sx={{ mb: 2, color: "primary.main" }}>
          {t("wishlist.results", { term: debouncedSearchTerm, count: total })}
        </Typography>
        <CardGrid>
          {items.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              itemType="wishlist"
              onPlay={() => onPlay(item, item.entity_type === "album" ? "album" : "artist")}
              onDelete={onDelete && isSinglePressing(item) ? () => onDelete(item) : undefined}
              onGotIt={onGotIt && isSinglePressing(item) ? () => onGotIt(item) : undefined}
              imageSize={{ w: 300, h: 300, q: 75 }}
            />
          ))}
        </CardGrid>
        {totalPages > 1 && (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
            <PaginationWithEllipsis count={totalPages} page={page} onChange={onPageChange} />
          </Box>
        )}
      </>
    );
  }

  if (items.length === 0) {
    return <EmptyState message={t("wishlist.empty")} />;
  }

  return (
    <>
      <CardGrid>
        {items.map((item) => (
          <MediaCard
            key={item.id}
            item={item}
            itemType="wishlist"
            onPlay={() => onPlay(item, item.entity_type === "album" ? "album" : "artist")}
            onDelete={onDelete && isSinglePressing(item) ? () => onDelete(item) : undefined}
            onGotIt={onGotIt && isSinglePressing(item) ? () => onGotIt(item) : undefined}
            imageSize={{ w: 500, h: 500, q: 85 }}
          />
        ))}
      </CardGrid>
      {totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <PaginationWithEllipsis count={totalPages} page={page} onChange={onPageChange} />
        </Box>
      )}
    </>
  );
}
