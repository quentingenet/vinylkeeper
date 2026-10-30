import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PlaceReportsPanel from "@components/Admin/PlaceReportsPanel";
import type { PlaceReport, PlaceReportList } from "@services/AdminApiService";

const admin = vi.hoisted(() => ({
  getPlaceReports: vi.fn(), resolvePlaceReport: vi.fn(), dismissPlaceReport: vi.fn(),
  updatePlace: vi.fn(), removePlace: vi.fn(),
}));
const atlas = vi.hoisted(() => ({ getPlaceTypes: vi.fn() }));
vi.mock("@services/AdminApiService", () => ({ adminApiService: admin }));
vi.mock("@services/AtlasApiService", () => ({ atlasApiService: atlas }));

const report: PlaceReport = {
  id: 9,
  place: {
    id: 3, name: "Paris Jazz Corner", address: "5 rue de Navarre", city: "Paris", country: "France",
    description: "Jazz records", source_url: "https://old.example.com", place_type_id: 1, place_type: "record_store",
    is_valid: true, is_moderated: true,
  },
  issues: ["website", "closed"],
  comment: "Their website is gone",
  status: "open",
  reporter: "jane",
  created_at: "2026-10-30T10:00:00Z",
  resolved_at: null,
};
const list = (items: PlaceReport[]): PlaceReportList => ({ items, total: items.length, page: 1, limit: 10, open_count: items.length });

const renderPanel = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <PlaceReportsPanel />
    </QueryClientProvider>
  );

beforeEach(() => {
  admin.getPlaceReports.mockResolvedValue(list([report]));
  atlas.getPlaceTypes.mockResolvedValue([{ id: 1, name: "record_store" }, { id: 2, name: "bar" }]);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("PlaceReportsPanel", () => {
  it("lists the open reports with what is wrong, the comment and who reported", async () => {
    renderPanel();

    expect(await screen.findByText("Paris Jazz Corner")).toBeInTheDocument();
    expect(screen.getByText("Spot reports (1 open)")).toBeInTheDocument();
    expect(screen.getByText("Website")).toBeInTheDocument();
    expect(screen.getByText("Closed")).toBeInTheDocument();
    expect(screen.getByText("“Their website is gone”")).toBeInTheDocument();
    expect(screen.getByText(/Reported by jane on/)).toBeInTheDocument();
    expect(admin.getPlaceReports).toHaveBeenCalledWith("open", 1, 10);
  });

  it("edits the spot then resolves its reports", async () => {
    admin.updatePlace.mockResolvedValue(report.place);
    admin.resolvePlaceReport.mockResolvedValue({ ...report, status: "resolved" });
    renderPanel();

    await userEvent.click(await screen.findByRole("button", { name: "Edit spot" }));
    const dialog = screen.getByRole("dialog", { name: "Edit spot" });
    const website = within(dialog).getByLabelText("Website");
    await userEvent.clear(website);
    // Pasted rather than typed key by key: fast and steady whatever the machine load
    await userEvent.click(website);
    await userEvent.paste("https://new.example.com");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save and resolve" }));

    expect(admin.updatePlace).toHaveBeenCalledWith(3, { source_url: "https://new.example.com" });
    await waitFor(() => expect(admin.resolvePlaceReport).toHaveBeenCalledWith(9));
  });

  it("sends only what changed, and warns that a new city moves the pin", async () => {
    renderPanel();

    await userEvent.click(await screen.findByRole("button", { name: "Edit spot" }));
    const dialog = screen.getByRole("dialog", { name: "Edit spot" });
    expect(within(dialog).getByRole("button", { name: "Save" })).toBeDisabled();

    const city = within(dialog).getByLabelText(/City/);
    await userEvent.clear(city);
    await userEvent.type(city, "Lyon");

    expect(within(dialog).getByText("The pin moves to the new city on the map.")).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    expect(admin.updatePlace).toHaveBeenCalledWith(3, { city: "Lyon" });
  });

  it("dismisses a report", async () => {
    admin.dismissPlaceReport.mockResolvedValue({ ...report, status: "dismissed" });
    renderPanel();

    await userEvent.click(await screen.findByRole("button", { name: "Dismiss" }));

    expect(admin.dismissPlaceReport).toHaveBeenCalledWith(9);
    expect(await screen.findByText("Report dismissed.")).toBeInTheDocument();
  });

  it("removes a closed spot from the map after confirmation", async () => {
    admin.removePlace.mockResolvedValue(undefined);
    renderPanel();

    await userEvent.click(await screen.findByRole("button", { name: "Remove from the map" }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Remove" }));

    expect(admin.removePlace).toHaveBeenCalledWith(3);
  });

  it("says when every spot looks right", async () => {
    admin.getPlaceReports.mockResolvedValue(list([]));
    renderPanel();

    expect(await screen.findByText("No open report: every spot looks right.")).toBeInTheDocument();
  });
});
