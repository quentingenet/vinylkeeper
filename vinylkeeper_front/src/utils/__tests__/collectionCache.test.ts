import { describe, it, expect } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { applyCollectionAlbum } from "@utils/collectionCache";
import { queryKeys } from "@utils/queryKeys";
import type {
  CollectionAlbumResponse,
  CollectionSearchResponse,
  PaginatedRecordsResponse,
} from "@models/Collection";

const album = (id: number, copies: number, overrides: Partial<CollectionAlbumResponse> = {}) =>
  ({
    id,
    external_album_id: String(id),
    title: `Album ${id}`,
    image_url: `cover-${id}.jpg`,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    collections_count: 1,
    loans_count: 0,
    wishlist_count: 0,
    copies_count: copies,
    ...overrides,
  }) as CollectionAlbumResponse;

const recordsPage = (pressings: CollectionAlbumResponse[]): PaginatedRecordsResponse => ({
  items: [
    {
      work_key: "master:1",
      title: pressings[0].title,
      image_url: pressings[0].image_url,
      pressings,
      pressings_count: pressings.length,
      copies_count: pressings.reduce((total, p) => total + (p.copies_count ?? 1), 0),
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
  ],
  total: 1,
  page: 1,
  limit: 12,
  total_pages: 1,
});

const setup = (pressings: CollectionAlbumResponse[]) => {
  const queryClient = new QueryClient();
  const pageKey = queryKeys.collections.recordsPage(7, 1, "newest");
  const searchKey = queryKeys.collections.searchQuery(7, "album", "album");
  queryClient.setQueryData(pageKey, recordsPage(pressings));
  queryClient.setQueryData<CollectionSearchResponse>(searchKey, {
    albums: pressings,
    artists: [],
    query: "album",
    search_type: "album",
  });
  return {
    queryClient,
    page: () => queryClient.getQueryData<PaginatedRecordsResponse>(pageKey)!.items[0],
    search: () => queryClient.getQueryData<CollectionSearchResponse>(searchKey)!.albums,
  };
};

describe("applyCollectionAlbum", () => {
  it("counts a new copy on the card of the grid and of a search", async () => {
    const { queryClient, page, search } = setup([album(1, 1), album(2, 1)]);

    await applyCollectionAlbum(queryClient, 7, 1, album(1, 2));

    expect(page().copies_count).toBe(3);
    expect(page().pressings[0].copies_count).toBe(2);
    expect(search()[0].copies_count).toBe(2);
  });

  it("shows the pressing picked in place of the replaced one", async () => {
    const { queryClient, page, search } = setup([album(1, 1)]);

    await applyCollectionAlbum(queryClient, 7, 1, album(9, 1, { title: "New pressing" }));

    expect(page().pressings.map((p) => p.id)).toEqual([9]);
    expect(page().title).toBe("New pressing");
    expect(page().image_url).toBe("cover-9.jpg");
    expect(search().map((p) => p.id)).toEqual([9]);
  });

  it("gathers the copies when the pressing picked was already there", async () => {
    const { queryClient, page } = setup([album(1, 1), album(2, 1)]);

    await applyCollectionAlbum(queryClient, 7, 1, album(2, 2));

    expect(page().pressings.map((p) => p.id)).toEqual([2]);
    expect(page().pressings_count).toBe(1);
    expect(page().copies_count).toBe(2);
  });
});
