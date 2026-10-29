import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ModalCollection from "@components/Collections/ModalCollection";
import type {
  CollectionDetailResponse,
  CollectionListItemResponse,
  PaginatedCollectionListResponse,
} from "@services/CollectionApiService";
import { queryKeys } from "@utils/queryKeys";

const api = vi.hoisted(() => ({ updateCollection: vi.fn(), createCollection: vi.fn() }));

vi.mock("@services/CollectionApiService", () => ({ collectionApiService: api }));
vi.mock("@hooks/useDetectMobile", () => ({ default: () => ({ isMobile: false }) }));
vi.mock("@contexts/UserContext", () => ({
  useUserContext: () => ({ currentUser: { user_uuid: "u-1" }, setIsLoading: vi.fn() }),
}));

afterEach(cleanup);

const collection = {
  id: 9,
  name: "Jazz shelf",
  description: "Old description",
  is_public: false,
  created_at: "2026-10-01T10:00:00Z",
  updated_at: "2026-10-01T10:00:00Z",
  albums_count: 3,
  artists_count: 2,
  likes_count: 0,
  is_liked_by_user: false,
  owner: { username: "kent1", user_uuid: "u-1" },
  preview_images: [],
} as CollectionListItemResponse;

const listPage = (items: CollectionListItemResponse[]): PaginatedCollectionListResponse => ({
  items,
  total: items.length,
  page: 2,
  limit: 3,
  total_pages: 2,
});

const renderModal = (queryClient: QueryClient, handleClose = vi.fn()) => {
  render(
    <QueryClientProvider client={queryClient}>
      <ModalCollection
        openModal
        isUpdatingCollection
        handleClose={handleClose}
        onCollectionAdded={vi.fn()}
        collection={collection}
        isPublic={false}
        setIsPublic={vi.fn()}
      />
    </QueryClientProvider>
  );
  return handleClose;
};

describe("ModalCollection update", () => {
  it("shows the new name and description at once, on the list page it is on and on the collection page", async () => {
    api.updateCollection.mockResolvedValue({ message: "Collection updated successfully" });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    // A list page other than the first one: the page the user edited the collection from
    queryClient.setQueryData(queryKeys.collections.list("u-1", 2, 3), listPage([collection]));
    queryClient.setQueryData<CollectionDetailResponse>(queryKeys.collections.detail(9), {
      id: 9, name: "Jazz shelf", description: "Old description", is_public: false, mood_id: null,
      owner_uuid: "u-1", owner: null, likes_count: 0, is_liked_by_user: false,
      created_at: "2026-10-01T10:00:00Z", updated_at: "2026-10-01T10:00:00Z",
    });
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const handleClose = renderModal(queryClient);
    const user = userEvent.setup();

    const name = screen.getByLabelText("Name");
    await user.clear(name);
    await user.type(name, "Blue Note shelf");
    await user.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() => expect(handleClose).toHaveBeenCalled());
    const page = queryClient.getQueryData<PaginatedCollectionListResponse>(queryKeys.collections.list("u-1", 2, 3));
    expect(page?.items[0].name).toBe("Blue Note shelf");
    expect(queryClient.getQueryData<CollectionDetailResponse>(queryKeys.collections.detail(9))?.name).toBe(
      "Blue Note shelf"
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.collections.public.all() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.collections.detail(9) });
  });
});
