import type { QueryClient } from "@tanstack/react-query";
import type {
  CollectionAlbumResponse,
  CollectionRecordResponse,
  CollectionSearchResponse,
  PaginatedRecordsResponse,
} from "@models/Collection";
import { queryKeys } from "@utils/queryKeys";

// The album answered by the API takes the place of albumId: same id after a copy change,
// another release after "Find my pressing" (gathered with it if already in the collection)
const swapPressing = (pressings: CollectionAlbumResponse[], albumId: number, updated: CollectionAlbumResponse) =>
  pressings.flatMap((p) => (p.id === albumId ? [updated] : p.id === updated.id ? [] : [p]));

const patchRecord = (record: CollectionRecordResponse, albumId: number, updated: CollectionAlbumResponse) => {
  if (!record.pressings.some((p) => p.id === albumId)) return record;
  const pressings = swapPressing(record.pressings, albumId, updated);
  return {
    ...record,
    title: pressings[0].title,
    image_url: pressings[0].image_url,
    pressings,
    pressings_count: pressings.length,
    copies_count: pressings.reduce((total, p) => total + (p.copies_count ?? 1), 0),
  };
};

/** Shows the album answered by the API right away on the cards of the collection, then reloads them. */
export async function applyCollectionAlbum(
  queryClient: QueryClient,
  collectionId: number,
  albumId: number,
  updated: CollectionAlbumResponse
) {
  queryClient.setQueriesData<PaginatedRecordsResponse>(
    { queryKey: queryKeys.collections.records(collectionId) },
    (old) => (old ? { ...old, items: old.items.map((record) => patchRecord(record, albumId, updated)) } : old)
  );
  queryClient.setQueriesData<CollectionSearchResponse>(
    { queryKey: queryKeys.collections.search(collectionId) },
    (old) => (old ? { ...old, albums: swapPressing(old.albums, albumId, updated) } : old)
  );
  await refreshCollectionAlbums(queryClient, collectionId);
}

/** Everything that shows the albums of a collection: its cards, a search in it, the owned pressings, the stats. */
export function refreshCollectionAlbums(queryClient: QueryClient, collectionId: number) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.collections.detail(collectionId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.collections.albums(collectionId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.collections.search(collectionId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.ownedPressingsAll() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats() }),
  ]);
}
