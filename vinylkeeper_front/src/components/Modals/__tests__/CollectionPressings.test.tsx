import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import CollectionPressings from "@components/Modals/CollectionPressings";
import type { CollectionAlbumResponse } from "@models/Collection";
import { VinylStateEnum } from "@utils/GlobalUtils";

const api = vi.hoisted(() => ({
  addAlbumCopy: vi.fn(),
  updateAlbumCopy: vi.fn(),
  deleteAlbumCopy: vi.fn(),
  confirmAlbumPressing: vi.fn(),
}));
vi.mock("@services/CollectionApiService", () => ({ collectionApiService: api }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const copy = (id: number, overrides = {}) => ({ id, created_at: "2024-01-01T00:00:00Z", ...overrides });

const pressing = (id: number, overrides: Partial<CollectionAlbumResponse> = {}): CollectionAlbumResponse => ({
  id,
  external_album_id: String(id),
  title: "Miles Davis - Kind Of Blue",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  collections_count: 1,
  loans_count: 0,
  wishlist_count: 0,
  pressing_confirmed: true,
  copies: [copy(10 * id, { state_record: VinylStateEnum.MINT })],
  copies_count: 1,
  ...overrides,
} as CollectionAlbumResponse);

const renderPressings = (pressings: CollectionAlbumResponse[], props: Record<string, unknown> = {}) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <CollectionPressings
          collectionId={7}
          pressings={pressings}
          canEdit
          onFindPressing={vi.fn()}
          {...props}
        />
      </LocalizationProvider>
    </QueryClientProvider>
  );

describe("CollectionPressings, one pressing", () => {
  it("shows its copies without an accordion", () => {
    renderPressings([pressing(1)]);

    expect(screen.queryByText(/Pressings in this collection/)).not.toBeInTheDocument();
    expect(screen.getByText("Copy 1")).toBeInTheDocument();
  });

  it("adds a copy and shows it right away", async () => {
    api.addAlbumCopy.mockResolvedValue(
      pressing(1, { copies: [copy(10, { state_record: VinylStateEnum.MINT }), copy(11)], copies_count: 2 })
    );
    renderPressings([pressing(1)]);

    await userEvent.click(screen.getByRole("button", { name: "Add a copy" }));

    expect(await screen.findByText("Copy 2")).toBeInTheDocument();
    expect(api.addAlbumCopy).toHaveBeenCalledWith(7, 1, {});
  });

  it("deletes a copy only once confirmed, and never the last one", async () => {
    const two = pressing(1, { copies: [copy(10), copy(11)], copies_count: 2 });
    api.deleteAlbumCopy.mockResolvedValue(pressing(1, { copies: [copy(10)] }));
    renderPressings([two]);

    await userEvent.click(screen.getByRole("button", { name: "Delete copy 2" }));
    expect(api.deleteAlbumCopy).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByText("Copy 2")).not.toBeInTheDocument());
    expect(api.deleteAlbumCopy).toHaveBeenCalledWith(7, 1, 11);
    expect(screen.queryByRole("button", { name: /Delete copy/ })).not.toBeInTheDocument();
  });

  it("saves the condition of one copy", async () => {
    api.updateAlbumCopy.mockResolvedValue(pressing(1, { copies: [copy(10, { state_record: VinylStateEnum.FAIR })] }));
    renderPressings([pressing(1)]);

    await userEvent.click(screen.getByRole("combobox", { name: "Record state" }));
    await userEvent.click(await screen.findByRole("option", { name: "Fair" }));
    await userEvent.click(screen.getByRole("button", { name: "Save copy 1" }));

    await waitFor(() => expect(api.updateAlbumCopy).toHaveBeenCalled());
    expect(api.updateAlbumCopy).toHaveBeenCalledWith(7, 1, 10, {
      state_record: VinylStateEnum.FAIR,
      state_cover: null,
      acquisition_month_year: null,
    });
  });

  it("lets visitors read the condition only", () => {
    renderPressings([pressing(1)], { canEdit: false });

    expect(screen.getByText("Record: Mint")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add a copy" })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });
});

describe("CollectionPressings, several pressings", () => {
  const original = pressing(1, { release_year: 1959, country: "US", label: "Columbia", catno: "CL 1355" });
  const reissue = pressing(2, {
    release_year: 2010, country: "US", pressing_confirmed: false, copies_count: 2,
    copies: [copy(20), copy(21)],
  });

  it("lists one accordion per pressing", () => {
    renderPressings([original, reissue]);

    expect(screen.getByText("Pressings in this collection (2)")).toBeInTheDocument();
    expect(screen.getByText("1959, US, Columbia CL 1355")).toBeInTheDocument();
    expect(screen.getByText(/2010, US\s+×2/)).toBeInTheDocument();
  });

  it("asks to confirm an unconfirmed pressing inside its accordion", async () => {
    api.confirmAlbumPressing.mockResolvedValue({ ...reissue, pressing_confirmed: true });
    renderPressings([original, reissue]);

    await userEvent.click(screen.getByText(/2010, US/));
    await userEvent.click(screen.getByRole("button", { name: "Yes, this is my pressing" }));

    await waitFor(() => expect(api.confirmAlbumPressing).toHaveBeenCalledWith(7, 2));
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Yes, this is my pressing" })).not.toBeInTheDocument()
    );
  });

  it("removes one pressing from the collection", async () => {
    const onRemovePressing = vi.fn();
    renderPressings([original, reissue], { onRemovePressing });

    await userEvent.click(screen.getByText(/2010, US/));
    const details = screen.getByText(/2010, US/).closest(".MuiAccordion-root") as HTMLElement;
    await userEvent.click(within(details).getByRole("button", { name: "Remove this pressing from the collection" }));

    expect(onRemovePressing).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }));
  });
});
