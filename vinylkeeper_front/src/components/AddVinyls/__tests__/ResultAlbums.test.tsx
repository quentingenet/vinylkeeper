import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ResultAlbums from "@components/AddVinyls/ResultAlbums";
import type { IAlbumRequestResults } from "@models/IRequestProxy";

vi.mock("@hooks/useDetectMobile", () => ({ default: () => ({ isMobile: false }) }));
vi.mock("@contexts/UserContext", () => ({ useUserContext: () => ({ currentUser: { user_uuid: "u-1" } }) }));
const api = vi.hoisted(() => ({
  getCollections: vi.fn(),
  addToCollection: vi.fn(),
  findOwnedPressings: vi.fn(),
}));
vi.mock("@services/CollectionApiService", () => ({ collectionApiService: { getCollections: api.getCollections } }));
vi.mock("@services/ExternalReferenceService", () => ({
  externalReferenceApiService: { addToCollection: api.addToCollection, findOwnedPressings: api.findOwnedPressings },
}));
// Needs the date pickers localization context of the app; not what is tested here
vi.mock("@components/AddVinyls/AlbumStateForm", () => ({ default: () => null }));
vi.mock("@components/Modals/PlaybackModal", () => ({
  default: ({ isOpen, item }: { isOpen: boolean; item: { title: string; itemType: string } | null }) =>
    isOpen ? <div data-testid="details">{`${item?.itemType}: ${item?.title}`}</div> : null,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const album: IAlbumRequestResults = { uuid: "u1", id: "1353040", title: "Miles Davis - Kind Of Blue", year: "1959" };

const renderResults = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ResultAlbums data={[album]} />
    </QueryClientProvider>
  );

describe("ResultAlbums", () => {
  it("opens the album details from the add modal", async () => {
    const user = userEvent.setup();
    renderResults();

    await user.click(screen.getByText("Miles Davis - Kind Of Blue"));
    await user.click(await screen.findByRole("button", { name: "View album details" }));

    expect(screen.getByTestId("details")).toHaveTextContent("album: Miles Davis - Kind Of Blue");
    await waitFor(() => expect(screen.queryByText("Add to wishlist")).not.toBeInTheDocument());
  });
});

describe("Adding a search result", () => {
  it("tells the API the pressing was picked in sight of its details", async () => {
    api.getCollections.mockResolvedValue({ items: [{ id: 7, name: "Jazz shelf", description: "" }] });
    api.addToCollection.mockResolvedValue({ is_new: true, message: "Added" });
    api.findOwnedPressings.mockResolvedValue([]);
    const user = userEvent.setup();
    renderResults();

    await user.click(screen.getByText("Miles Davis - Kind Of Blue"));
    await user.click(await screen.findByRole("button", { name: "Add to collection" }));
    await user.click(await screen.findByText("Jazz shelf"));

    await waitFor(() => expect(api.addToCollection).toHaveBeenCalled());
    expect(api.addToCollection.mock.calls[0][0]).toBe(7);
    expect(api.addToCollection.mock.calls[0][1]).toMatchObject({ external_id: "1353040", pressing_confirmed: true });
  });
});

describe("Adding a record already owned", () => {
  const sameRelease = {
    collection_id: 7, collection_name: "Jazz shelf", album_id: 3, external_album_id: "1353040",
    same_release: true, pressing_confirmed: true, copies_count: 1, formats: [],
  };

  const openCollectionChoice = async () => {
    api.getCollections.mockResolvedValue({ items: [{ id: 7, name: "Jazz shelf", description: "" }] });
    api.addToCollection.mockResolvedValue({ is_new: true, message: "Added another copy" });
    api.findOwnedPressings.mockResolvedValue([sameRelease]);
    const user = userEvent.setup();
    renderResults();
    await user.click(screen.getByText("Miles Davis - Kind Of Blue"));
    await user.click(await screen.findByRole("button", { name: "Add to collection" }));
    await screen.findByText("You have this pressing here");
    return user;
  };

  it("asks before adding, then adds another copy", async () => {
    const user = await openCollectionChoice();

    await user.click(screen.getByText("Jazz shelf"));
    expect(screen.getByText("You already have this pressing in Jazz shelf. Add another copy?")).toBeInTheDocument();
    expect(api.addToCollection).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Add another copy" }));

    await waitFor(() => expect(api.addToCollection).toHaveBeenCalled());
    expect(api.addToCollection.mock.calls[0][1]).toMatchObject({ add_copy: true });
  });

  it("adds nothing when cancelled", async () => {
    const user = await openCollectionChoice();

    await user.click(screen.getByText("Jazz shelf"));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByText(/Add another copy\?/)).not.toBeInTheDocument();
    expect(api.addToCollection).not.toHaveBeenCalled();
  });
});
