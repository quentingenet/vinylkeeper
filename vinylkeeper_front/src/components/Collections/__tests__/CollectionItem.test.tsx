import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CollectionItem from "@components/Collections/CollectionItem";
import type { CollectionListItemResponse } from "@services/CollectionApiService";

const saveCopyMutate = vi.hoisted(() => vi.fn());
const deleteCollectionMock = vi.hoisted(() => vi.fn());

vi.mock("@hooks/useCollections", () => ({
  useCollections: () => ({ deleteCollection: deleteCollectionMock, isDeletingCollection: false }),
  useSaveCollectionCopy: () => ({ mutate: saveCopyMutate, isPending: false }),
}));
vi.mock("@hooks/useLikeButton", () => ({
  useLikeButton: () => ({
    localIsLiked: false,
    localLikesCount: 0,
    likeBounce: false,
    isLiking: false,
    isUnliking: false,
    likeCooldown: false,
    handleLikeClick: vi.fn(),
  }),
}));

afterEach(cleanup);

const makeCollection = (
  overrides: Partial<CollectionListItemResponse> = {}
): CollectionListItemResponse => ({
  id: 1,
  name: "Jazz shelf",
  is_public: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  likes_count: 0,
  is_liked_by_user: false,
  albums_count: 12,
  artists_count: 3,
  ...overrides,
});

const renderItem = (
  collection: CollectionListItemResponse,
  onCollectionClick = vi.fn()
) =>
  render(
    <CollectionItem
      collection={collection}
      onSwitchArea={vi.fn()}
      handleOpenModalCollection={vi.fn()}
      onCollectionClick={onCollectionClick}
      isOwner={false}
      showOwner={true}
    />
  );

describe("CollectionItem", () => {
  it("lets the owner save a copy without opening the collection", async () => {
    const onCollectionClick = vi.fn();
    render(
      <CollectionItem
        collection={makeCollection({ id: 42 })}
        onSwitchArea={vi.fn()}
        handleOpenModalCollection={vi.fn()}
        onCollectionClick={onCollectionClick}
        isOwner={true}
        showOwner={false}
      />
    );

    await userEvent.setup().click(screen.getByRole("button", { name: "Save" }));

    expect(saveCopyMutate).toHaveBeenCalledWith(42, expect.any(Object));
    expect(onCollectionClick).not.toHaveBeenCalled();
  });

  it("offers no copy of someone else's collection", () => {
    renderItem(makeCollection());
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  });

  const renderOwned = (collection: CollectionListItemResponse) =>
    render(
      <CollectionItem
        collection={collection}
        onSwitchArea={vi.fn()}
        handleOpenModalCollection={vi.fn()}
        onCollectionClick={vi.fn()}
        isOwner={true}
        showOwner={false}
      />
    );

  it("explains that a collection has one save only, without asking the API", async () => {
    saveCopyMutate.mockClear();
    renderOwned(makeCollection({ save_collection_id: 8, save_collection_name: "SAVE Jazz shelf (2026-10-29)" }));

    await userEvent.setup().click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText(
        "Only one save per collection: “SAVE Jazz shelf (2026-10-29)” already exists. Delete it to make a new one."
      )
    ).toBeInTheDocument();
    expect(saveCopyMutate).not.toHaveBeenCalled();
  });

  it("names the collection and what goes with it before deleting it", async () => {
    renderOwned(makeCollection({ name: "Jazz shelf", albums_count: 12, artists_count: 1 }));
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Delete collection" }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Delete “Jazz shelf”?");
    expect(dialog).toHaveTextContent("is deleted with 12 records, 1 artist, 0 likes. This cannot be undone.");
    expect(dialog).toHaveTextContent("To keep a copy first");
  });

  it("deletes only once DELETE is typed", async () => {
    deleteCollectionMock.mockClear();
    renderOwned(makeCollection({ id: 5, name: "Jazz shelf" }));
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Delete collection" }));
    const deleteButton = await screen.findByRole("button", { name: "Delete" });

    expect(deleteButton).toBeDisabled();
    await user.type(screen.getByLabelText("Confirm deletion"), "delete");
    expect(deleteButton).toBeDisabled();
    await user.keyboard("{Enter}");
    expect(deleteCollectionMock).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText("Confirm deletion"));
    await user.type(screen.getByLabelText("Confirm deletion"), "DELETE");
    await user.click(deleteButton);

    expect(deleteCollectionMock).toHaveBeenCalledWith(5);
  });

  it("offers no save of a save", () => {
    renderOwned(makeCollection({ name: "SAVE Jazz shelf (2026-10-29)", saved_from_collection_id: 1 }));
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  });

  it("shows the album and artist counts", () => {
    renderItem(makeCollection());

    expect(screen.getByTestId("collection-content-counts")).toHaveTextContent(
      "12 albums · 3 artists"
    );
  });

  it("uses singular labels for a count of one", () => {
    renderItem(makeCollection({ albums_count: 1, artists_count: 1 }));

    expect(screen.getByTestId("collection-content-counts")).toHaveTextContent(
      "1 album · 1 artist"
    );
  });

  it("shows the cover mosaic when 6 covers are available", () => {
    const covers = Array.from({ length: 6 }, (_, i) => `https://i.discogs.com/c-${i}.jpg`);
    renderItem(makeCollection({ preview_images: covers }));

    expect(screen.getByTestId("cover-mosaic")).toBeInTheDocument();
  });

  it("keeps the default artwork when the API sends no preview_images (older API)", () => {
    renderItem(makeCollection());

    expect(screen.getByTestId("cover-mosaic-fallback")).toBeInTheDocument();
  });

  it("opens the collection when the header is clicked", async () => {
    const onCollectionClick = vi.fn();
    const collection = makeCollection();
    renderItem(collection, onCollectionClick);

    await userEvent.setup().click(screen.getByTestId("cover-mosaic-fallback"));

    expect(onCollectionClick).toHaveBeenCalledWith(collection);
  });
});
