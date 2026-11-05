import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PublicCollection from "@pages/Collections/PublicCollection";

const api = vi.hoisted(() => ({ getSharedCollection: vi.fn(), getSharedItems: vi.fn() }));

vi.mock("@services/CollectionApiService", () => ({ collectionApiService: api }));
vi.mock("@hooks/useDetectMobile", () => ({ default: () => ({ isMobile: false }) }));
vi.mock("@components/Landpage/PreviewModal", () => ({ default: () => null }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  document.head.querySelector('meta[name="robots"]')?.remove();
});

const TOKEN = "0123456789abcdef0123456789abcdef";
const NEXT = `next=%2Fshared%2F${TOKEN}`;

const shared = (overrides = {}) => ({
  id: 12,
  name: "Jazz shelf",
  description: "Blue Note first pressings",
  owner_username: "kent",
  records_count: 40,
  artists_count: 2,
  wishlist_count: 25,
  likes_count: 3,
  cover_url: "https://i.discogs.com/a.jpg",
  ...overrides,
});

const list = (overrides = {}) => ({
  items: [{ title: "Art Blakey - Moanin'", image_url: "https://i.discogs.com/a.jpg" }],
  total_count: 40,
  visible_count: 16,
  page: 2,
  total_pages: 2,
  ...overrides,
});

const answers = (collection = shared(), items = list()) => {
  api.getSharedCollection.mockResolvedValue(collection);
  api.getSharedItems.mockResolvedValue(items);
};

const renderAt = (url = `/shared/${TOKEN}`) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/shared/:token" element={<PublicCollection />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );

describe("PublicCollection", () => {
  it("shows a taste of the collection under the bar of the public Atlas", async () => {
    answers();
    renderAt();

    expect(await screen.findByRole("heading", { name: "Jazz shelf" })).toBeInTheDocument();
    expect(screen.getByText("A collection by kent")).toBeInTheDocument();
    expect(screen.getByText("Blue Note first pressings")).toBeInTheDocument();
    expect(screen.getByText("40 records")).toBeInTheDocument();
    expect(await screen.findByText("24 more records in this collection. Join Vinyl Keeper to see them all.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", `/?auth=login&${NEXT}`);
    expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute("href", `/?auth=register&${NEXT}`);
    expect(screen.getByText("Discogs")).toBeInTheDocument();
    expect(api.getSharedCollection).toHaveBeenCalledWith(TOKEN);
    expect(api.getSharedItems).toHaveBeenCalledWith(TOKEN, "records", 1);
  });

  it("lets the visitor page up to the limit, and only then invites to join", async () => {
    window.scrollTo = vi.fn();
    api.getSharedCollection.mockResolvedValue(shared());
    api.getSharedItems.mockImplementation((_token: string, _kind: string, page: number) =>
      Promise.resolve(list({ page, items: [{ title: `Record of page ${page}`, image_url: null }] }))
    );
    renderAt();

    expect(await screen.findByRole("button", { name: "Record of page 1" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "See the whole collection" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "2" }));

    expect(await screen.findByRole("button", { name: "Record of page 2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "See the whole collection" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the artists on their first page, with the same limit", async () => {
    answers(shared(), list({ page: 1, total_pages: 2 }));
    renderAt();
    await screen.findByRole("heading", { name: "Jazz shelf" });

    api.getSharedItems.mockResolvedValue(
      list({ items: [{ title: "Miles Davis", image_url: null }], total_count: 30, visible_count: 12, page: 2, total_pages: 2 })
    );
    await userEvent.click(screen.getByRole("tab", { name: "Artists" }));

    expect(await screen.findByRole("button", { name: "Miles Davis" })).toBeInTheDocument();
    expect(api.getSharedItems).toHaveBeenLastCalledWith(TOKEN, "artists", 1);
    expect(screen.getByText("18 more artists in this collection. Join Vinyl Keeper to see them all.")).toBeInTheDocument();
  });

  it("shows the whole wishlist, for who wants to offer a record", async () => {
    answers();
    renderAt();
    await screen.findByRole("heading", { name: "Jazz shelf" });

    api.getSharedItems.mockResolvedValue(
      list({ items: [{ title: "Wanted record", image_url: null }], total_count: 25, visible_count: 25, page: 3, total_pages: 3 })
    );
    await userEvent.click(screen.getByRole("tab", { name: "Wishlist" }));

    expect(await screen.findByRole("button", { name: "Wanted record" })).toBeInTheDocument();
    expect(screen.getByText("Looking for a gift? Here is everything kent is hunting for.")).toBeInTheDocument();
    expect(screen.queryByText(/Join Vinyl Keeper to see/)).not.toBeInTheDocument();
  });

  it("opens a single popup, whatever the visitor clicks", async () => {
    answers();
    renderAt();

    await userEvent.click(await screen.findByRole("button", { name: "See the whole collection" }));

    expect(await screen.findAllByRole("dialog")).toHaveLength(1);
  });

  it.each([
    ["a record", "Art Blakey - Moanin'"],
    ["the likes", "3 likes"],
    ["the whole collection", "See the whole collection"],
  ])("invites the visitor with the popup of the Atlas from %s", async (_case, name) => {
    answers();
    renderAt();

    await userEvent.click(await screen.findByRole("button", { name }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Join Vinyl Keeper to see this whole collection")).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "Sign up" })).toHaveAttribute(
      "href",
      `/?auth=register&${NEXT}`
    );
  });

  it("stays out of search engines", async () => {
    answers();
    renderAt();

    await screen.findByRole("heading", { name: "Jazz shelf" });

    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  });

  it("invites to the other collections when this one is too small to page through", async () => {
    answers(shared({ records_count: 10 }), list({ total_count: 10, visible_count: 6, page: 1, total_pages: 1 }));
    renderAt();

    expect(await screen.findByText("Join Vinyl Keeper to see every digger's collection.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Join Vinyl Keeper" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "See the whole collection" })).not.toBeInTheDocument();
  });

  it("copes with a collection without records", async () => {
    answers(shared({ records_count: 0 }), list({ items: [], total_count: 0, visible_count: 0, page: 1, total_pages: 1 }));
    renderAt();

    expect(await screen.findByText("No records in this collection yet.")).toBeInTheDocument();
  });

  it("says when the owner made it private", async () => {
    api.getSharedCollection.mockRejectedValue({ code: 4003, message: "This collection is private", details: {} });
    renderAt();

    expect(await screen.findByRole("heading", { name: "This collection is now private" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Explore the Vinyl Atlas" })).toHaveAttribute("href", "/atlas");
    expect(api.getSharedCollection).toHaveBeenCalledTimes(1);
  });

  it("says it at once when it became private while the visitor browses", async () => {
    answers();
    api.getSharedItems.mockRejectedValue({ code: 4003, message: "This collection is private", details: {} });
    renderAt();

    expect(await screen.findByRole("heading", { name: "This collection is now private" })).toBeInTheDocument();
  });

  it("says when it was deleted", async () => {
    api.getSharedCollection.mockRejectedValue({ code: 2000, message: "not found", details: {} });
    renderAt();

    expect(await screen.findByRole("heading", { name: "This collection no longer exists" })).toBeInTheDocument();
  });

  it("does not call the API for a link that cannot be a collection", async () => {
    renderAt("/shared/174");

    expect(await screen.findByRole("heading", { name: "This collection no longer exists" })).toBeInTheDocument();
    expect(api.getSharedCollection).not.toHaveBeenCalled();
  });

  it("never calls a failure of the network a deleted collection", async () => {
    api.getSharedCollection.mockRejectedValue(new Error("network"));
    renderAt();

    expect(await screen.findByRole("heading", { name: "This collection could not be loaded" }, { timeout: 5000 })).toBeInTheDocument();

    answers();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("heading", { name: "Jazz shelf" })).toBeInTheDocument();
  }, 10000);
});
