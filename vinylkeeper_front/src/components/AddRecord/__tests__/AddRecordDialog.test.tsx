import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import AddRecordDialog from "@components/AddRecord/AddRecordDialog";
import type { AddRecordOptions } from "@contexts/AddRecordContext";
import type { DiscogsData, SearchResultsPage } from "@models/IRequestProxy";
import { queryKeys } from "@utils/queryKeys";

const api = vi.hoisted(() => ({
  searchMusicPage: vi.fn(),
  getCollections: vi.fn(),
  addToCollection: vi.fn(),
  addToWishlist: vi.fn(),
  findOwnedPressings: vi.fn(),
  replacePressing: vi.fn(),
}));

vi.mock("@services/SearchApiService", () => ({ searchApiService: { searchMusicPage: api.searchMusicPage } }));
vi.mock("@services/CollectionApiService", () => ({ collectionApiService: { getCollections: api.getCollections } }));
vi.mock("@services/ExternalReferenceService", () => ({
  externalReferenceApiService: {
    addToCollection: api.addToCollection,
    addToWishlist: api.addToWishlist,
    findOwnedPressings: api.findOwnedPressings,
    replacePressing: api.replacePressing,
  },
}));
vi.mock("@hooks/useDetectMobile", () => ({ default: () => ({ isMobile: false }) }));
vi.mock("@contexts/UserContext", () => ({ useUserContext: () => ({ currentUser: { user_uuid: "u-1" } }) }));
// Needs the date pickers localization context of the app; not what is tested here
vi.mock("@components/Records/AlbumStateForm", () => ({ default: () => null }));
vi.mock("@components/Modals/PlaybackModal", () => ({
  default: ({ isOpen, item }: { isOpen: boolean; item: { title: string; itemType: string } | null }) =>
    isOpen ? <div data-testid="details">{`${item?.itemType}: ${item?.title}`}</div> : null,
}));

const release = (id: string, title: string, year = "1959"): DiscogsData => ({ uuid: id, id, title, type: "album", year });
const page = (items: DiscogsData[], pageNumber = 1, totalPages = 1): SearchResultsPage => ({
  items,
  page: pageNumber,
  total_pages: totalPages,
});

const renderDialog = (options: AddRecordOptions = {}, queryClient = new QueryClient(), onClose = vi.fn()) => {
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AddRecordDialog options={options} onClose={onClose} />
      </MemoryRouter>
    </QueryClientProvider>
  );
  return onClose;
};

const searchFor = async (query: string) => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Search by album"), `${query}{Enter}`);
  return user;
};

beforeEach(() => {
  vi.clearAllMocks();
  api.getCollections.mockResolvedValue({
    items: [
      { id: 7, name: "Jazz shelf", description: "" },
      { id: 8, name: "Sundays", description: "" },
    ],
  });
  api.findOwnedPressings.mockResolvedValue([]);
  api.addToCollection.mockResolvedValue({ is_new: true, message: "Added" });
});
afterEach(cleanup);

describe("Searching", () => {
  it("searches albums by default and calls nothing before the first search", () => {
    renderDialog();

    expect(screen.getByLabelText("Search by album")).toBeInTheDocument();
    expect(api.searchMusicPage).not.toHaveBeenCalled();
  });

  it("lists the results of the first page with their pressing", async () => {
    api.searchMusicPage.mockResolvedValue(page([release("1", "Miles Davis - Kind Of Blue")]));
    renderDialog();

    await searchFor("kind of blue");

    expect(await screen.findByText("Miles Davis - Kind Of Blue")).toBeInTheDocument();
    expect(screen.getByText("1959")).toBeInTheDocument();
    expect(api.searchMusicPage).toHaveBeenCalledWith({ query: "kind of blue", is_artist: false, page: 1 });
  });

  it("loads the next page, and starts again from the first one on a new search", async () => {
    api.searchMusicPage.mockImplementation(({ page: requested }: { page: number }) =>
      Promise.resolve(page([release(String(requested), `Pressing ${requested}`)], requested, 3))
    );
    renderDialog();

    const user = await searchFor("kind of blue");
    await screen.findByText("Pressing 1");
    await user.click(screen.getByRole("button", { name: "2" }));
    expect(await screen.findByText("Pressing 2")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Search by album"));
    await user.type(screen.getByLabelText("Search by album"), "brel{Enter}");
    await waitFor(() =>
      expect(api.searchMusicPage).toHaveBeenLastCalledWith({ query: "brel", is_artist: false, page: 1 })
    );
  });

  it("searches artists when asked", async () => {
    api.searchMusicPage.mockResolvedValue(page([]));
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("button", { name: "Artist" }));
    await user.type(screen.getByLabelText("Search by artist"), "brel{Enter}");

    await waitFor(() => expect(api.searchMusicPage).toHaveBeenCalledWith({ query: "brel", is_artist: true, page: 1 }));
    expect(await screen.findByText("No artist found")).toBeInTheDocument();
  });

  it("asks for 2 characters instead of searching an empty field", async () => {
    renderDialog();

    await searchFor(" ");

    expect(api.searchMusicPage).not.toHaveBeenCalled();
    expect(screen.getByText("Type at least 2 characters to search.")).toBeInTheDocument();
  });

  it("reports a failed search", async () => {
    api.searchMusicPage.mockRejectedValue(new Error("Failed to search music"));
    renderDialog();

    await searchFor("kind of blue");

    expect(await screen.findByText("Failed to search music")).toBeInTheDocument();
  });

  it("ignores an error cached under the key of the idle search", async () => {
    const queryClient = new QueryClient();
    await queryClient
      .fetchQuery({
        queryKey: queryKeys.search.page("", false, 1),
        queryFn: () => Promise.reject(new Error("Failed to search music")),
        retry: false,
      })
      .catch(() => undefined);

    renderDialog({}, queryClient);

    expect(screen.queryByText("Failed to search music")).not.toBeInTheDocument();
  });
});

describe("Adding a result", () => {
  const openFirstResult = async (options: AddRecordOptions = {}) => {
    api.searchMusicPage.mockResolvedValue(page([release("1353040", "Miles Davis - Kind Of Blue")]));
    renderDialog(options);
    const user = await searchFor("kind of blue");
    await user.click(await screen.findByText("Miles Davis - Kind Of Blue"));
    await screen.findByRole("button", { name: "Add to collection" });
    return user;
  };

  it("adds to the collection chosen, as a pressing picked in sight of its details", async () => {
    const user = await openFirstResult();

    await user.click(screen.getByRole("combobox", { name: "Collection" }));
    await user.click(await screen.findByRole("option", { name: "Sundays" }));
    await user.click(screen.getByRole("button", { name: "Add to collection" }));

    await waitFor(() => expect(api.addToCollection).toHaveBeenCalled());
    expect(api.addToCollection.mock.calls[0][0]).toBe(8);
    expect(api.addToCollection.mock.calls[0][1]).toMatchObject({ external_id: "1353040", pressing_confirmed: true });
  });

  it("preselects the collection it was opened from, other ones staying available", async () => {
    const user = await openFirstResult({ presetCollectionId: 8 });

    expect(screen.getByRole("combobox", { name: "Collection" })).toHaveTextContent("Sundays");
    await user.click(screen.getByRole("button", { name: "Add to collection" }));

    await waitFor(() => expect(api.addToCollection.mock.calls[0][0]).toBe(8));
  });

  it("adds to the wishlist from the same place", async () => {
    api.addToWishlist.mockResolvedValue({ is_new: true, message: "Added to wishlist" });
    const user = await openFirstResult({ presetCollectionId: 8 });

    await user.click(screen.getByRole("button", { name: "Add to wishlist" }));

    await waitFor(() => expect(api.addToWishlist).toHaveBeenCalledWith(expect.objectContaining({ external_id: "1353040" })));
  });

  it("asks before adding a pressing already owned, then adds another copy", async () => {
    api.findOwnedPressings.mockResolvedValue([
      { collection_id: 7, collection_name: "Jazz shelf", album_id: 3, external_album_id: "1353040",
        same_release: true, pressing_confirmed: true, copies_count: 1, formats: [] },
    ]);
    const user = await openFirstResult();

    await user.click(screen.getByRole("button", { name: "Add to collection" }));
    expect(screen.getByText("You already have this pressing in Jazz shelf. Add another copy?")).toBeInTheDocument();
    expect(api.addToCollection).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Add another copy" }));

    await waitFor(() => expect(api.addToCollection.mock.calls[0][1]).toMatchObject({ add_copy: true }));
  });

  it("shows what the API says when the record was already there, as a warning", async () => {
    api.addToCollection.mockResolvedValue({ is_new: false, message: "Already have album 'Kind Of Blue'" });
    const user = await openFirstResult();

    await user.click(screen.getByRole("button", { name: "Add to collection" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Already have album 'Kind Of Blue'");
    expect(alert.className).toMatch(/Warning/);
  });

  it("says when adding failed", async () => {
    api.addToCollection.mockRejectedValue(new Error("Failed to add item to collection"));
    const user = await openFirstResult();

    await user.click(screen.getByRole("button", { name: "Add to collection" }));

    expect(await screen.findByText("Could not add the record. Please try again.")).toBeInTheDocument();
  });

  it("opens the details of a result", async () => {
    const user = await openFirstResult();

    await user.click(screen.getByRole("button", { name: "View album details" }));

    expect(screen.getByTestId("details")).toHaveTextContent("album: Miles Davis - Kind Of Blue");
  });
});

describe("Finding the right pressing", () => {
  const replaceTarget = { collectionId: 7, albumId: 10, title: "Brel - Brel" };

  it("lists the pressings of the album right away", async () => {
    api.searchMusicPage.mockResolvedValue(page([release("2", "Brel - Brel")]));
    renderDialog({ replaceTarget, initialQuery: "Brel - Brel" });

    expect(await screen.findByText("Brel - Brel")).toBeInTheDocument();
    expect(api.searchMusicPage).toHaveBeenCalledWith({ query: "Brel - Brel", is_artist: false, page: 1 });
    expect(screen.getByText(/Pick the pressing on your shelf/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Artist" })).not.toBeInTheDocument();
  });

  it("replaces the pressing once confirmed and closes", async () => {
    api.searchMusicPage.mockResolvedValue(page([release("2", "Brel - Brel")]));
    api.replacePressing.mockResolvedValue({ id: 2 });
    const user = userEvent.setup();
    const onClose = renderDialog({ replaceTarget, initialQuery: "Brel - Brel" });

    await user.click(await screen.findByText("Brel - Brel"));
    await user.click(screen.getByRole("button", { name: "This is my pressing" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(api.replacePressing).toHaveBeenCalledWith(7, 10, expect.objectContaining({ external_id: "2" }));
    expect(api.addToCollection).not.toHaveBeenCalled();
  });

  it("keeps the dialog open with a message when the replacement fails", async () => {
    api.searchMusicPage.mockResolvedValue(page([release("2", "Brel - Brel")]));
    api.replacePressing.mockRejectedValue(new Error("Failed"));
    const user = userEvent.setup();
    const onClose = renderDialog({ replaceTarget, initialQuery: "Brel - Brel" });

    await user.click(await screen.findByText("Brel - Brel"));
    await user.click(screen.getByRole("button", { name: "This is my pressing" }));

    expect(await screen.findByText("Could not replace the pressing. Please try again.")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("Closing", () => {
  it("closes from its close button", async () => {
    const onClose = renderDialog();

    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalled();
  });
});
