import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SpinningNow from "@pages/SpinningNow/SpinningNow";
import type { SpinningNowAlbum, SpinningNowOptions } from "@models/ISpinningNow";

const api = vi.hoisted(() => ({ getOptions: vi.fn(), pick: vi.fn() }));
const mobileState = vi.hoisted(() => ({ isMobile: false }));

vi.mock("@hooks/useDetectMobile", () => ({ default: () => mobileState }));

const addRecord = vi.hoisted(() => ({ openAddRecord: vi.fn() }));
vi.mock("@contexts/AddRecordContext", () => ({ useAddRecord: () => addRecord }));

vi.mock("@services/SpinningNowApiService", () => ({ spinningNowApiService: api }));
vi.mock("@components/Modals/PlaybackModal", () => ({
  default: ({ isOpen, item }: { isOpen: boolean; item: { title: string } | null }) =>
    isOpen ? <div data-testid="playback">{item?.title}</div> : null,
}));

const options: SpinningNowOptions = {
  total_albums: 3,
  moods: [{ name: "laid_back", description: "Relaxed.", albums_count: 2 }],
  eras: [{ decade: 1970, albums_count: 3 }],
  genres: [{ name: "Reggae", albums_count: 2 }],
  collections: [
    { id: 7, name: "Mine", albums_count: 3 },
    { id: 8, name: "Sundays", albums_count: 1 },
  ],
};

const album: SpinningNowAlbum = {
  id: 1, external_album_id: "509137", title: "Bob Marley - Uprising", artist_name: "Bob Marley",
  image_url: null, year: 1980, genres: ["Reggae"], styles: ["Reggae"], moods: ["laid_back"],
  collections: [{ id: 7, name: "Mine" }],
};

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <SpinningNow />
      </MemoryRouter>
    </QueryClientProvider>
  );

beforeEach(() => {
  api.getOptions.mockResolvedValue(options);
  api.pick.mockResolvedValue({ total: 1, items: [album] });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mobileState.isMobile = false;
});

describe("SpinningNow page", () => {
  it("shows filters from the user's collections and random records", async () => {
    renderPage();

    expect(await screen.findByRole("button", { name: "Laid back (2)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1970s (3)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reggae (2)" })).toBeInTheDocument();
    expect(await screen.findByText("Uprising")).toBeInTheDocument();
    expect(screen.getByText("The more records you add, the better your picks get.")).toBeInTheDocument();
    expect(api.pick).toHaveBeenCalledWith({ moods: [], eras: [], genres: [], collections: [] });
  });

  it.each([
    [false, "true"],
    [true, "false"],
  ])("filter groups start expanded unless on mobile (mobile=%s)", async (isMobile, expanded) => {
    mobileState.isMobile = isMobile;
    renderPage();

    for (const title of ["Mood", "Era", "Genre", "Collection"]) {
      expect(await screen.findByRole("button", { name: title })).toHaveAttribute("aria-expanded", expanded);
    }
  });

  it("filters by collection when the user has several", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Sundays (1)" }));

    await waitFor(() =>
      expect(api.pick).toHaveBeenLastCalledWith({ moods: [], eras: [], genres: [], collections: [8] })
    );
  });

  it("hides the collection filter when the user has a single collection", async () => {
    api.getOptions.mockResolvedValue({ ...options, collections: [{ id: 7, name: "Mine", albums_count: 3 }] });
    renderPage();

    await screen.findByRole("button", { name: "Laid back (2)" });
    expect(screen.queryByRole("button", { name: "Collection" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mine (3)" })).not.toBeInTheDocument();
  });

  it("refetches with the selected filters and can clear them", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Laid back (2)" }));
    await user.click(screen.getByRole("button", { name: "1970s (3)" }));

    await waitFor(() =>
      expect(api.pick).toHaveBeenLastCalledWith({ moods: ["laid_back"], eras: [1970], genres: [], collections: [] })
    );

    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Laid back (2)" })).toHaveAttribute("aria-pressed", "false");
  });

  it("opens the player on a record", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Play Uprising by Bob Marley" }));

    expect(screen.getByTestId("playback")).toHaveTextContent("Bob Marley - Uprising");
  });

  it("'Surprise me' picks one record and opens the player", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Surprise me" }));

    await waitFor(() => expect(screen.getByTestId("playback")).toBeInTheDocument());
    expect(api.pick).toHaveBeenLastCalledWith({ moods: [], eras: [], genres: [], collections: [] }, 1);
  });

  it("'Surprise me' explains when nothing matches", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Uprising");
    api.pick.mockResolvedValueOnce({ total: 0, items: [] });

    await user.click(screen.getByRole("button", { name: "Surprise me" }));

    expect(await screen.findByText("Nothing matches these filters yet. Try removing one.")).toBeInTheDocument();
    expect(screen.queryByTestId("playback")).not.toBeInTheDocument();
  });

  it("says when no record matches the filters", async () => {
    api.pick.mockResolvedValue({ total: 0, items: [] });
    renderPage();

    expect(await screen.findByText("No record matches these filters.")).toBeInTheDocument();
  });

  it("invites to add vinyls when the collections are empty", async () => {
    api.getOptions.mockResolvedValue({ ...options, total_albums: 0, moods: [], eras: [], genres: [], collections: [] });
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Add your first vinyls" }));

    expect(addRecord.openAddRecord).toHaveBeenCalled();
    expect(screen.getByText(/No records in your collections yet/)).toBeInTheDocument();
    expect(api.pick).not.toHaveBeenCalled();
  });

  it("explains missing filters while records are not analysed yet, and still picks records", async () => {
    api.getOptions.mockResolvedValue({ total_albums: 1, moods: [], eras: [], genres: [], collections: [] });
    const user = userEvent.setup();
    renderPage();

    expect(
      await screen.findByText("Moods, eras and genres show up once your records have been analysed.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Mood" })).not.toBeInTheDocument();
    expect(await screen.findByText("Uprising")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Surprise me" }));
    await waitFor(() => expect(screen.getByTestId("playback")).toBeInTheDocument());
  });

  it("does not show the analysis hint when filters are available", async () => {
    renderPage();

    await screen.findByRole("button", { name: "Laid back (2)" });
    expect(screen.queryByText(/show up once your records have been analysed/)).not.toBeInTheDocument();
  });

  it("shows an error message when options cannot be loaded", async () => {
    api.getOptions.mockRejectedValue(new Error("down"));
    renderPage();

    expect(await screen.findByText("Spinning now is unavailable right now. Please try again later.")).toBeInTheDocument();
  });
});
