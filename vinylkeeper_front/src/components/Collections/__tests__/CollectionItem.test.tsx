import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CollectionItem from "@components/Collections/CollectionItem";
import type { CollectionListItemResponse } from "@services/CollectionApiService";

vi.mock("@hooks/useCollections", () => ({
  useCollections: () => ({ deleteCollection: vi.fn(), isDeletingCollection: false }),
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
