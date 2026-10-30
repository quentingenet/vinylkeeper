import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import MediaCard from "@components/Collections/MediaCard";
import WishlistTabContent from "@components/Collections/WishlistTabContent";
import WishlistPressings from "@components/Modals/WishlistPressings";
import MoveToCollectionDialog from "@components/Collections/MoveToCollectionDialog";
import { wantedPressingTitle } from "@components/Collections/wishlistLabels";
import type { WishlistItemResponse, WishlistPressing } from "@models/IExternalReference";

const api = vi.hoisted(() => ({ getCollections: vi.fn(), moveWishlistItemToCollection: vi.fn() }));

vi.mock("@services/CollectionApiService", () => ({ collectionApiService: { getCollections: api.getCollections } }));
vi.mock("@services/ExternalReferenceService", () => ({
  externalReferenceApiService: { moveWishlistItemToCollection: api.moveWishlistItemToCollection },
}));
vi.mock("@contexts/UserContext", () => ({ useUserContext: () => ({ currentUser: { user_uuid: "u-1" } }) }));

afterEach(cleanup);

const pressing = (id: number, overrides: Partial<WishlistPressing> = {}): WishlistPressing => ({
  id,
  external_id: String(1000 + id),
  title: "Miles Davis - Kind Of Blue",
  image_url: null,
  created_at: "2026-10-30T10:00:00Z",
  release_year: 1959,
  country: "US",
  label: "Columbia",
  catno: "CL 1355",
  formats: ["LP", "Mono"],
  ...overrides,
});

const card = (id: number, pressings: WishlistPressing[], entity_type = "album"): WishlistItemResponse => ({
  id,
  external_id: String(1000 + id),
  title: "Miles Davis - Kind Of Blue",
  image_url: "",
  created_at: "2026-10-30T10:00:00Z",
  entity_type,
  source: "",
  pressings_count: Math.max(pressings.length, 1),
  pressings,
});

describe("Wishlist cards", () => {
  it("shows ×2 for two wanted pressings of a work", () => {
    render(<MediaCard item={{ title: "Kind Of Blue", pressings_count: 2 }} itemType="wishlist" onPlay={vi.fn()} />);
    expect(screen.getByLabelText("2 pressings")).toHaveTextContent("×2");
  });

  it("moves a single pressing from its card, without opening it", async () => {
    const onPlay = vi.fn();
    const onGotIt = vi.fn();
    render(<MediaCard item={{ title: "Kind Of Blue" }} itemType="wishlist" onPlay={onPlay} onGotIt={onGotIt} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Move to a collection" }));

    expect(onGotIt).toHaveBeenCalledTimes(1);
    expect(onPlay).not.toHaveBeenCalled();
  });

  it("never removes nor moves several pressings at once from a card", () => {
    const props = {
      isLoading: false, searchTerm: "", debouncedSearchTerm: "", total: 2, totalPages: 1, page: 1,
      onPageChange: vi.fn(), onPlay: vi.fn(), onDelete: vi.fn(), onGotIt: vi.fn(),
    };
    render(<WishlistTabContent {...props} items={[card(1, [pressing(1), pressing(2)])]} />);

    expect(screen.queryByRole("button", { name: "Move to a collection" })).not.toBeInTheDocument();
    cleanup();

    render(<WishlistTabContent {...props} items={[card(3, [pressing(3)])]} />);
    expect(screen.getByRole("button", { name: "Move to a collection" })).toBeInTheDocument();
    cleanup();

    // An artist goes into a collection too
    render(<WishlistTabContent {...props} items={[card(4, [], "artist")]} />);
    expect(screen.getByRole("button", { name: "Move to a collection" })).toBeInTheDocument();
  });
});

describe("Wanted pressings of a work", () => {
  it("names each pressing by its edition", () => {
    expect(wantedPressingTitle(pressing(1), 1)).toBe("1959, US, Columbia CL 1355");
    expect(wantedPressingTitle(pressing(2, { release_year: null, country: null, label: null, catno: null }), 2))
      .toBe("Pressing 2");
  });

  it("moves or removes one pressing, for the owner only", async () => {
    const onMove = vi.fn();
    const onRemove = vi.fn();
    const reissue = pressing(2, { release_year: 2015, country: "EU", label: "Sony", catno: "88875" });
    render(<WishlistPressings pressings={[pressing(1), reissue]} canEdit onMove={onMove} onRemove={onRemove} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Move 2015, EU, Sony 88875 to a collection" }));
    await user.click(screen.getByRole("button", { name: "Remove 1959, US, Columbia CL 1355 from the wishlist" }));

    expect(onMove).toHaveBeenCalledWith(reissue);
    expect(onRemove).toHaveBeenCalledWith(pressing(1));
    cleanup();

    render(<WishlistPressings pressings={[pressing(1), reissue]} canEdit={false} onMove={onMove} onRemove={onRemove} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("MoveToCollectionDialog", () => {
  beforeEach(() => {
    api.getCollections.mockResolvedValue({
      items: [
        { id: 9, name: "SAVE Jazz shelf (2026-10-29)", saved_from_collection_id: 7 },
        { id: 7, name: "Jazz shelf" },
        { id: 8, name: "Soul" },
      ],
      total: 3, page: 1, limit: 100, total_pages: 1,
    });
    api.moveWishlistItemToCollection.mockReset();
  });

  it("moves the pressing into the collection picked, saves left out", async () => {
    api.moveWishlistItemToCollection.mockResolvedValue({
      message: "“Kind Of Blue” moved to “Jazz shelf”", collection_id: 7, collection_name: "Jazz shelf",
      external_id: "1001", entity_type: "album", already_in_collection: false,
    });
    const onMoved = vi.fn();
    const onClose = vi.fn();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MoveToCollectionDialog
          record={{ id: 1, title: "Kind Of Blue", entityType: "album", pressing: pressing(1) }}
          onClose={onClose}
          onMoved={onMoved}
        />
      </QueryClientProvider>
    );
    const user = userEvent.setup();

    const dialog = await screen.findByRole("dialog", { name: "Got it? Move it to a collection" });
    expect(dialog).toHaveTextContent("leaves your wishlist");
    await user.click(await within(dialog).findByLabelText("Collection"));
    expect(screen.queryByRole("option", { name: /SAVE/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("option", { name: "Soul" }));
    await user.click(screen.getByRole("button", { name: "Move" }));

    expect(api.moveWishlistItemToCollection).toHaveBeenCalledWith(1, 8, true);
    await vi.waitFor(() => expect(onMoved).toHaveBeenCalledWith("“Kind Of Blue” moved to “Jazz shelf”"));
    expect(onClose).toHaveBeenCalled();
  });

  it("lets the owner say the pressing is not sure: to confirm or replace in the collection", async () => {
    api.moveWishlistItemToCollection.mockResolvedValue({
      message: "moved", collection_id: 7, collection_name: "Jazz shelf", external_id: "1001",
      entity_type: "album", already_in_collection: false,
    });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MoveToCollectionDialog
          record={{ id: 1, title: "Kind Of Blue", entityType: "album", pressing: pressing(1) }}
          onClose={vi.fn()}
          onMoved={vi.fn()}
        />
      </QueryClientProvider>
    );
    const user = userEvent.setup();
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("1959");
    expect(dialog).toHaveTextContent("Columbia CL 1355");

    await user.click(within(dialog).getByRole("checkbox", { name: "This is the exact pressing I got" }));
    expect(dialog).toHaveTextContent("find the right one to replace it");
    await within(dialog).findByLabelText("Collection");
    await user.click(within(dialog).getByRole("button", { name: "Move" }));

    expect(api.moveWishlistItemToCollection).toHaveBeenCalledWith(1, 7, false);
  });

  it("moves an artist without a pressing to confirm", async () => {
    api.moveWishlistItemToCollection.mockResolvedValue({
      message: "moved", collection_id: 7, collection_name: "Jazz shelf", external_id: "55",
      entity_type: "artist", already_in_collection: false,
    });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MoveToCollectionDialog record={{ id: 2, title: "Miles Davis", entityType: "artist" }} onClose={vi.fn()} onMoved={vi.fn()} />
      </QueryClientProvider>
    );
    const user = userEvent.setup();
    const dialog = await screen.findByRole("dialog");

    expect(dialog).toHaveTextContent("joins the artists of the collection");
    expect(within(dialog).queryByRole("checkbox")).not.toBeInTheDocument();
    await within(dialog).findByLabelText("Collection");
    await user.click(within(dialog).getByRole("button", { name: "Move" }));

    expect(api.moveWishlistItemToCollection).toHaveBeenCalledWith(2, 7, true);
  });
});
