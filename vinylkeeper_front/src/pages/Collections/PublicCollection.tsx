import { useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Box, Button, ButtonBase, Chip, Tab, Tabs, Typography } from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { collectionApiService } from "@services/CollectionApiService";
import type { SharedCollectionResponse, SharedItem, SharedItemsKind, SharedItemsResponse } from "@models/Collection";
import CollectionsPagination from "@components/Collections/CollectionsPagination";
import CollectionUnavailable from "@components/Collections/CollectionUnavailable";
import JoinVinylKeeperDialog from "@components/Atlas/JoinVinylKeeperDialog";
import PublicPage from "@components/Layout/PublicPage";
import DiscogsAttribution from "@components/UI/DiscogsAttribution";
import LoadingCenter from "@components/UI/LoadingCenter";
import { primaryTabsSx } from "@components/UI/tabsStyles";
import { usePageMeta } from "@hooks/usePageMeta";
import { fadeInImageStyle, revealImage } from "@utils/ImageFadeIn";
import { buildProxyImageUrl } from "@utils/ImageProxyHelper";
import { EGlobalUrls, registerUrl, sharedCollectionUrl } from "@utils/GlobalUrls";
import { parseShareToken, retryCollection, unavailableReason } from "@utils/collectionAvailability";
import { queryKeys } from "@utils/queryKeys";

const DISCOGS_URL = "https://www.discogs.com";
// The footer of a public page is fixed: the end of the page must clear it
const FOOTER_ROOM = 10;

const TABS: { kind: SharedItemsKind; label: string; noun: string; emptyText: string }[] = [
  { kind: "records", label: "Albums", noun: "record", emptyText: "No records in this collection yet." },
  { kind: "artists", label: "Artists", noun: "artist", emptyText: "No artists in this collection yet." },
  { kind: "wishlist", label: "Wishlist", noun: "record", emptyText: "Nothing on this wishlist yet." },
];

const formatCount = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;

function ItemTile({ item, onClick }: { item: SharedItem; onClick: () => void }) {
  const title = item.title ?? "Unknown";
  const cover = item.image_url ? buildProxyImageUrl(item.image_url, 240, 240, 80, true) || item.image_url : null;

  return (
    <ButtonBase
      onClick={onClick}
      aria-label={title}
      // A button centers its content: a one line title must not push the cover down
      sx={{ display: "flex", flexDirection: "column", justifyContent: "flex-start", alignItems: "stretch", textAlign: "left" }}
    >
      <Box
        component="img"
        key={cover}
        src={cover ?? "/images/vinylKeeper.svg"}
        alt=""
        loading="lazy"
        onLoad={revealImage}
        sx={{
          ...fadeInImageStyle,
          display: "block",
          width: "100%",
          aspectRatio: "1",
          objectFit: "cover",
          borderRadius: 1,
          backgroundColor: "background.paper",
        }}
      />
      <Typography
        variant="caption"
        component="p"
        sx={{
          mt: 0.5,
          color: "text.secondary",
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}
      >
        {title}
      </Typography>
    </ButtonBase>
  );
}

interface InvitationProps {
  hiddenCount: number;
  noun: string;
  /** Too small to page through: the invitation is to the other collections */
  isSmall: boolean;
  onJoin: () => void;
}

/** At the end of what a visitor can see, not before: the pages come first. */
function Invitation({ hiddenCount, noun, isSmall, onJoin }: InvitationProps) {
  return (
    <Box
      sx={{
        mt: 4,
        p: 3,
        borderRadius: 1,
        textAlign: "center",
        backgroundColor: "background.paper",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1.5,
      }}
    >
      <LockOutlinedIcon sx={{ color: "primary.main" }} />
      <Typography variant="body1">
        {isSmall
          ? "Join Vinyl Keeper to see every digger's collection."
          : `${formatCount(hiddenCount, `more ${noun}`)} in this collection. Join Vinyl Keeper to see them all.`}
      </Typography>
      <Button variant="contained" onClick={onJoin}>
        {isSmall ? "Join Vinyl Keeper" : "See the whole collection"}
      </Button>
    </Box>
  );
}

interface SharedListProps {
  kind: SharedItemsKind;
  noun: string;
  emptyText: string;
  list: SharedItemsResponse;
  onPageChange: (page: number) => void;
  onJoin: () => void;
}

function SharedList({ kind, noun, emptyText, list, onPageChange, onJoin }: SharedListProps) {
  const isLastPage = list.page >= list.total_pages;

  return (
    <>
      {list.items.length > 0 ? (
        <Box
          // A grid, not a wrapping row: every cover on its line, the last row included
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(3, minmax(0, 1fr))", md: "repeat(5, minmax(0, 1fr))" },
            gap: 2,
          }}
        >
          {list.items.map((item, index) => (
            <ItemTile key={`${item.title}-${index}`} item={item} onClick={onJoin} />
          ))}
        </Box>
      ) : (
        <Typography variant="body1" sx={{ color: "text.secondary", textAlign: "center", my: 4 }}>
          {emptyText}
        </Typography>
      )}

      <CollectionsPagination totalPages={list.total_pages} page={list.page} onChange={onPageChange} />

      {/* The wishlist has no limit: nothing to invite to on it */}
      {isLastPage && kind !== "wishlist" && (
        <Invitation
          hiddenCount={list.total_count - list.visible_count}
          noun={noun}
          isSmall={list.total_pages <= 1}
          onJoin={onJoin}
        />
      )}
    </>
  );
}

interface SharedCollectionProps {
  collection: SharedCollectionResponse;
  kind: SharedItemsKind;
  list: SharedItemsResponse | undefined;
  onTabChange: (kind: SharedItemsKind) => void;
  onPageChange: (page: number) => void;
  onJoin: () => void;
}

function SharedCollection({ collection, kind, list, onTabChange, onPageChange, onJoin }: SharedCollectionProps) {
  const tab = TABS.find((candidate) => candidate.kind === kind) ?? TABS[0];

  return (
    <Box
      component="main"
      sx={{ flexGrow: 1, width: "100%", maxWidth: 1000, mx: "auto", boxSizing: "border-box", px: 2, pt: 3, pb: FOOTER_ROOM }}
    >
      <Typography variant="h4" component="h1" sx={{ color: "primary.main", overflowWrap: "anywhere" }}>
        {collection.name}
      </Typography>
      {collection.owner_username && (
        <Typography variant="body1" sx={{ color: "text.secondary" }}>
          A collection by {collection.owner_username}
        </Typography>
      )}
      {collection.description && (
        <Typography variant="body1" sx={{ mt: 1, overflowWrap: "anywhere" }}>
          {collection.description}
        </Typography>
      )}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, my: 2 }}>
        <Chip variant="outlined" size="small" label={formatCount(collection.records_count, "record")} />
        {collection.artists_count > 0 && (
          <Chip variant="outlined" size="small" label={formatCount(collection.artists_count, "artist")} />
        )}
        <Chip
          variant="outlined"
          size="small"
          icon={<FavoriteIcon />}
          label={formatCount(collection.likes_count, "like")}
          onClick={onJoin}
        />
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs
          value={kind}
          onChange={(_event, value: SharedItemsKind) => onTabChange(value)}
          aria-label="Shared collection"
          variant="fullWidth"
          sx={primaryTabsSx}
        >
          {TABS.map(({ kind: value, label }) => (
            <Tab key={value} value={value} label={label} />
          ))}
        </Tabs>
      </Box>

      {kind === "wishlist" && collection.wishlist_count > 0 && (
        <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", mb: 2 }}>
          Looking for a gift? Here is everything {collection.owner_username ?? "this digger"} is hunting for.
        </Typography>
      )}

      {list ? (
        <SharedList
          kind={kind}
          noun={tab.noun}
          emptyText={tab.emptyText}
          list={list}
          onPageChange={onPageChange}
          onJoin={onJoin}
        />
      ) : (
        <LoadingCenter />
      )}

      <Box sx={{ mt: 2, textAlign: "center" }}>
        <DiscogsAttribution href={DISCOGS_URL} />
      </Box>
    </Box>
  );
}

/** A public collection for someone who has its link and no session: a taste, then an invitation. */
export default function PublicCollection() {
  const { token } = useParams<{ token: string }>();
  const shareToken = parseShareToken(token);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [kind, setKind] = useState<SharedItemsKind>("records");
  const [page, setPage] = useState(1);
  const nextPath = shareToken ? sharedCollectionUrl(shareToken) : undefined;

  // A collection made private must not stay on screen from the cache
  const noCache = { staleTime: 0, gcTime: 0 };

  const collection = useQuery({
    queryKey: queryKeys.collections.shared(shareToken ?? ""),
    queryFn: () => collectionApiService.getSharedCollection(shareToken ?? ""),
    enabled: shareToken !== null,
    retry: retryCollection,
    ...noCache,
  });

  const items = useQuery({
    queryKey: queryKeys.collections.sharedItems(shareToken ?? "", kind, page),
    queryFn: () => collectionApiService.getSharedItems(shareToken ?? "", kind, page),
    enabled: collection.isSuccess,
    retry: retryCollection,
    // The current page stays on screen while the next one loads, never the list of another tab
    placeholderData: (previous, previousQuery) => (previousQuery?.queryKey[2] === kind ? keepPreviousData(previous) : undefined),
    ...noCache,
  });

  const data = collection.data;
  usePageMeta({
    title: data ? `${data.name} | Vinyl Keeper` : "Shared collection | Vinyl Keeper",
    description: data
      ? `Have a look at ${data.owner_username ?? "this digger"}'s collection and discover vinylkeeper.org. ${formatCount(data.records_count, "record")}.`
      : undefined,
    // Shared by link, not published: members made these public for other collectors
    noIndex: true,
  });

  const error = collection.error ?? items.error;
  const reason = shareToken === null ? "gone" : error ? unavailableReason(error) : null;

  return (
    <PublicPage nextPath={nextPath}>
      {collection.isLoading ? (
        <LoadingCenter />
      ) : reason ? (
        <CollectionUnavailable reason={reason}>
          {reason === "error" ? (
            <Button variant="contained" onClick={() => void Promise.all([collection.refetch(), items.refetch()])}>
              Try again
            </Button>
          ) : (
            <>
              <Button component={RouterLink} to={EGlobalUrls.ATLAS} variant="text">
                Explore the Vinyl Atlas
              </Button>
              <Button component={RouterLink} to={registerUrl()} variant="contained">
                Join Vinyl Keeper
              </Button>
            </>
          )}
        </CollectionUnavailable>
      ) : data ? (
        <SharedCollection
          collection={data}
          kind={kind}
          list={items.data}
          onTabChange={(nextKind) => {
            setKind(nextKind);
            setPage(1);
          }}
          onPageChange={(nextPage) => {
            setPage(nextPage);
            window.scrollTo({ top: 0 });
          }}
          onJoin={() => setIsJoinOpen(true)}
        />
      ) : null}
      <JoinVinylKeeperDialog
        open={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        title="Join Vinyl Keeper to see this whole collection"
        nextPath={nextPath}
      />
    </PublicPage>
  );
}
