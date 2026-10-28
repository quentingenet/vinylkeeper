import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AddVinyls from "@pages/AddVinyls/AddVinyls";
import type { DiscogsData, SearchResultsPage } from "@models/IRequestProxy";
import { queryKeys } from "@utils/queryKeys";

const api = vi.hoisted(() => ({ searchMusicPage: vi.fn(), replacePressing: vi.fn() }));

vi.mock("@services/SearchApiService", () => ({ searchApiService: { searchMusicPage: api.searchMusicPage } }));
vi.mock("@services/ExternalReferenceService", () => ({
  externalReferenceApiService: { replacePressing: api.replacePressing },
}));
vi.mock("@hooks/useDetectMobile", () => ({ default: () => ({ isMobile: false }) }));
vi.mock("@components/AddVinyls/AddToCollectionModal", () => ({ default: () => null }));
vi.mock("@components/Modals/PlaybackModal", () => ({ default: () => null }));

const release = (id: string, title: string): DiscogsData => ({ uuid: id, id, title, type: "album", year: "1959" });

const page = (items: DiscogsData[], pageNumber: number, totalPages: number): SearchResultsPage => ({
  items,
  page: pageNumber,
  total_pages: totalPages,
});

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <AddVinyls />
      </MemoryRouter>
    </QueryClientProvider>
  );

const searchAlbums = async (query: string) => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Search by album"), `${query}{Enter}`);
  return user;
};

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("AddVinyls search", () => {
  it("searches albums by default", () => {
    renderPage();

    expect(screen.getByLabelText("Search by album")).toBeInTheDocument();
  });

  it("shows nothing before the first search", () => {
    renderPage();

    expect(api.searchMusicPage).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /page/i })).not.toBeInTheDocument();
  });

  it("searches the first page and shows the results with their edition", async () => {
    api.searchMusicPage.mockResolvedValue(page([release("1", "Miles Davis - Kind Of Blue")], 1, 1));
    renderPage();

    await searchAlbums("kind of blue");

    expect(await screen.findByText("Miles Davis - Kind Of Blue")).toBeInTheDocument();
    expect(screen.getByText("1959")).toBeInTheDocument();
    expect(api.searchMusicPage).toHaveBeenCalledWith({ query: "kind of blue", is_artist: false, page: 1 });
  });

  it("loads the next page of the same search", async () => {
    api.searchMusicPage.mockImplementation(({ page: requested }: { page: number }) =>
      Promise.resolve(page([release(String(requested), `Pressing ${requested}`)], requested, 3))
    );
    window.scrollTo = vi.fn();
    renderPage();

    const user = await searchAlbums("kind of blue");
    await screen.findByText("Pressing 1");
    await user.click(screen.getByRole("button", { name: "2" }));

    expect(await screen.findByText("Pressing 2")).toBeInTheDocument();
    expect(api.searchMusicPage).toHaveBeenLastCalledWith({ query: "kind of blue", is_artist: false, page: 2 });
  });

  it("starts again from the first page on a new search", async () => {
    api.searchMusicPage.mockImplementation(({ page: requested }: { page: number }) =>
      Promise.resolve(page([release(String(requested), `Pressing ${requested}`)], requested, 3))
    );
    window.scrollTo = vi.fn();
    renderPage();

    const user = await searchAlbums("kind of blue");
    await screen.findByText("Pressing 1");
    await user.click(screen.getByRole("button", { name: "2" }));
    await screen.findByText("Pressing 2");
    await user.clear(screen.getByLabelText("Search by album"));
    await user.type(screen.getByLabelText("Search by album"), "brel{Enter}");

    await waitFor(() =>
      expect(api.searchMusicPage).toHaveBeenLastCalledWith({ query: "brel", is_artist: false, page: 1 })
    );
  });

  it("does not show the error of a previous visit when coming back to the page", async () => {
    api.searchMusicPage.mockRejectedValue(new Error("Failed to search music"));
    const queryClient = new QueryClient();
    const page = () => (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
        <AddVinyls />
      </MemoryRouter>
      </QueryClientProvider>
    );
    const { unmount } = render(page());
    await searchAlbums("kind of blue");
    await screen.findAllByText("Failed to search music");
    unmount();

    render(page());

    expect(screen.queryByText("Failed to search music")).not.toBeInTheDocument();
  });

  it("ignores an error cached under the key of the idle search", async () => {
    // What an empty search used to leave behind: the page read it back on the next visit
    const queryClient = new QueryClient();
    await queryClient
      .fetchQuery({
        queryKey: queryKeys.search.page("", false, 1),
        queryFn: () => Promise.reject(new Error("Failed to search music")),
        retry: false,
      })
      .catch(() => undefined);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
        <AddVinyls />
      </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.queryByText("Failed to search music")).not.toBeInTheDocument();
  });

  it("asks for 2 characters instead of searching an empty field", async () => {
    renderPage();

    await searchAlbums(" ");

    expect(api.searchMusicPage).not.toHaveBeenCalled();
    expect(screen.getAllByText("Type at least 2 characters to search.")).not.toHaveLength(0);
  });

  it("reports a failed search", async () => {
    api.searchMusicPage.mockRejectedValue(new Error("Failed to search music"));
    renderPage();

    await searchAlbums("kind of blue");

    expect(await screen.findAllByText("Failed to search music")).not.toHaveLength(0);
  });
});

describe("AddVinyls in replace mode", () => {
  const url = "/add-vinyls?q=Brel+-+Brel&replaceCollection=7&replaceAlbum=10";
  const renderReplaceMode = () =>
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={[url]}>
          <Routes>
            <Route path="/add-vinyls" element={<AddVinyls />} />
            <Route path="/collections/:id" element={<div>Collection page</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

  it("lists the pressings of the album right away", async () => {
    api.searchMusicPage.mockResolvedValue(page([release("2", "Brel - Brel")], 1, 1));
    renderReplaceMode();

    expect(await screen.findByText("Brel - Brel")).toBeInTheDocument();
    expect(api.searchMusicPage).toHaveBeenCalledWith({ query: "Brel - Brel", is_artist: false, page: 1 });
    expect(screen.getByText(/Pick the pressing on your shelf/)).toBeInTheDocument();
    expect(screen.getByLabelText("Search by album")).toHaveValue("Brel - Brel");
  });

  it("replaces the pressing once confirmed and goes back to the collection", async () => {
    api.searchMusicPage.mockResolvedValue(page([release("2", "Brel - Brel")], 1, 1));
    api.replacePressing.mockResolvedValue({ id: 2 });
    const user = userEvent.setup();
    renderReplaceMode();

    await user.click(await screen.findByText("Brel - Brel"));
    await user.click(screen.getByRole("button", { name: "This is my pressing" }));

    expect(await screen.findByText("Collection page")).toBeInTheDocument();
    expect(api.replacePressing).toHaveBeenCalledWith(7, 10, expect.objectContaining({ external_id: "2" }));
  });

  it("keeps the dialog open with a message when the replacement fails", async () => {
    api.searchMusicPage.mockResolvedValue(page([release("2", "Brel - Brel")], 1, 1));
    api.replacePressing.mockRejectedValue(new Error("Failed"));
    const user = userEvent.setup();
    renderReplaceMode();

    await user.click(await screen.findByText("Brel - Brel"));
    await user.click(screen.getByRole("button", { name: "This is my pressing" }));

    expect(await screen.findByText("Could not replace the pressing. Please try again.")).toBeInTheDocument();
  });

  it("cancel goes back to the collection without replacing anything", async () => {
    api.searchMusicPage.mockResolvedValue(page([], 1, 1));
    const user = userEvent.setup();
    renderReplaceMode();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(await screen.findByText("Collection page")).toBeInTheDocument();
    expect(api.replacePressing).not.toHaveBeenCalled();
  });
});
