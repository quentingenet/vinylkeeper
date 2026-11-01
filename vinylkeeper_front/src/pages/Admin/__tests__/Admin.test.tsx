import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Admin from "@pages/Admin/Admin";
import type { ModerationRequest } from "@services/AdminApiService";
import { formatDate } from "@components/Admin/adminUtils";

const admin = vi.hoisted(() => ({
  getModerationRequests: vi.fn(), getPendingModerationRequests: vi.fn(), getModerationStats: vi.fn(),
  getPlaceReports: vi.fn(), updatePlace: vi.fn(), removePlace: vi.fn(),
}));
const atlas = vi.hoisted(() => ({ getPlaceTypes: vi.fn() }));
vi.mock("@services/AdminApiService", () => ({ adminApiService: admin }));
vi.mock("@services/AtlasApiService", () => ({ atlasApiService: atlas }));
vi.mock("@contexts/UserContext", () => ({ useUserContext: () => ({ currentUser: { is_admin: true } }) }));

const UPDATED_AT = "2026-10-31T09:15:00Z";

const request: ModerationRequest = {
  id: 4,
  place_id: 12,
  user_id: 1,
  status_id: 2,
  created_at: "2025-06-28T14:20:00Z",
  submitted_at: "2025-06-28T14:20:00Z",
  place: {
    id: 12, name: "Millerecords", address: "Via Roma 1", city: "Rome", country: "Italy",
    description: "Since the sixties", source_url: null, place_type_id: 1,
    place_type: { id: 1, name: "record_store" }, is_moderated: true, is_valid: true, updated_at: UPDATED_AT,
  },
  user: { username: "kent1", user_uuid: "u-1" },
  status: { id: 2, name: "approved" },
};

const renderAdmin = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Admin />
    </QueryClientProvider>
  );

beforeEach(() => {
  const page = { items: [request], total: 1, page: 1, limit: 10, total_pages: 1 };
  admin.getModerationRequests.mockResolvedValue({ ...page, pending_count: 0, approved_count: 1, rejected_count: 0 });
  admin.getPendingModerationRequests.mockResolvedValue({ ...page, items: [], total: 0 });
  admin.getModerationStats.mockResolvedValue({ total: 1, pending: 0, approved: 1, rejected: 0 });
  admin.getPlaceReports.mockResolvedValue({ items: [], total: 0, page: 1, limit: 10, open_count: 0 });
  admin.updatePlace.mockResolvedValue({ ...request.place, place_type: "record_store" });
  admin.removePlace.mockResolvedValue(undefined);
  atlas.getPlaceTypes.mockResolvedValue([{ id: 1, name: "record_store" }]);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Admin moderation lists", () => {
  it("shows when each spot was last updated", async () => {
    renderAdmin();

    const row = (await screen.findByText("Millerecords")).closest("tr")!;
    expect(screen.getByRole("columnheader", { name: "Last update" })).toBeInTheDocument();
    expect(within(row).getByText(formatDate(UPDATED_AT))).toBeInTheDocument();
  });

  it("edits a spot from its row, without a report to resolve", async () => {
    renderAdmin();

    const row = (await screen.findByText("Millerecords")).closest("tr")!;
    await userEvent.click(within(row).getByRole("button", { name: "Edit spot" }));
    const dialog = screen.getByRole("dialog", { name: "Edit spot" });

    expect(within(dialog).getByText(`Last update: ${formatDate(UPDATED_AT)}`)).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Save and resolve" })).not.toBeInTheDocument();

    const website = within(dialog).getByRole("textbox", { name: "Website" });
    await userEvent.type(website, "https://millerecords.it");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(admin.updatePlace).toHaveBeenCalledWith(12, { source_url: "https://millerecords.it" })
    );
    expect(await screen.findByText("Spot updated on the map.")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Edit spot" })).not.toBeInTheDocument());
  });

  it("removes a spot from the map after a confirmation", async () => {
    renderAdmin();

    const row = (await screen.findByText("Millerecords")).closest("tr")!;
    await userEvent.click(within(row).getByRole("button", { name: "Remove from the map" }));
    const dialog = screen.getByRole("dialog", { name: "Remove Millerecords from the map?" });
    expect(admin.removePlace).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole("button", { name: "Remove" }));

    await waitFor(() => expect(admin.removePlace).toHaveBeenCalledWith(12));
    expect(await screen.findByText("Spot removed from the map.")).toBeInTheDocument();
  });

  it("cancelling the confirmation keeps the spot", async () => {
    renderAdmin();

    const row = (await screen.findByText("Millerecords")).closest("tr")!;
    await userEvent.click(within(row).getByRole("button", { name: "Remove from the map" }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));

    expect(admin.removePlace).not.toHaveBeenCalled();
  });

  it("a removed spot shows as removed, without edit or remove", async () => {
    const removed = { ...request, place: { ...request.place!, is_valid: false } };
    admin.getModerationRequests.mockResolvedValue({
      items: [removed], total: 1, page: 1, limit: 10, total_pages: 1, pending_count: 0, approved_count: 0, rejected_count: 0,
    });
    renderAdmin();

    const row = (await screen.findByText("Millerecords")).closest("tr")!;
    expect(within(row).getByText("Removed")).toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: "Edit spot" })).not.toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: "Remove from the map" })).not.toBeInTheDocument();
  });
});
