import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CollectionReportsPanel from "@components/Admin/CollectionReportsPanel";
import type { CollectionReport, CollectionReportList } from "@services/AdminApiService";

const admin = vi.hoisted(() => ({
  getCollectionReports: vi.fn(), resolveCollectionReport: vi.fn(), dismissCollectionReport: vi.fn(),
}));
vi.mock("@services/AdminApiService", () => ({ adminApiService: admin }));

const report: CollectionReport = {
  id: 7,
  collection: { id: 4, name: "Bob's crates", description: "Ads everywhere", is_public: true, owner: "bob" },
  reason: "spam",
  comment: "Every record links to a shop",
  status: "open",
  reporter: "jane",
  created_at: "2026-11-18T10:00:00Z",
  resolved_at: null,
};
const list = (items: CollectionReport[]): CollectionReportList =>
  ({ items, total: items.length, page: 1, limit: 10, open_count: items.filter((r) => r.status === "open").length });

const renderPanel = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <CollectionReportsPanel />
      </MemoryRouter>
    </QueryClientProvider>
  );

beforeEach(() => {
  admin.getCollectionReports.mockResolvedValue(list([report]));
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("CollectionReportsPanel", () => {
  it("shows the reported collection, why, by whom, with a link to it", async () => {
    renderPanel();

    const link = await screen.findByRole("link", { name: "Bob's crates" });
    expect(link).toHaveAttribute("href", "/collections/4");
    expect(screen.getByText("Collection reports (1 open)")).toBeInTheDocument();
    expect(screen.getByText("by bob")).toBeInTheDocument();
    expect(screen.getByText("Spam")).toBeInTheDocument();
    expect(screen.getByText("“Every record links to a shop”")).toBeInTheDocument();
    expect(screen.getByText(/Reported by jane on/)).toBeInTheDocument();
    expect(admin.getCollectionReports).toHaveBeenCalledWith("open", 1, 10);
  });

  it("resolves or dismisses an open report", async () => {
    admin.resolveCollectionReport.mockResolvedValue({ ...report, status: "resolved" });
    admin.dismissCollectionReport.mockResolvedValue({ ...report, status: "dismissed" });
    renderPanel();

    await userEvent.click(await screen.findByRole("button", { name: "Resolve" }));
    expect(await screen.findByText("Report resolved, with the other open reports of this collection.")).toBeInTheDocument();
    expect(admin.resolveCollectionReport).toHaveBeenCalledWith(7);

    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    await waitFor(() => expect(admin.dismissCollectionReport).toHaveBeenCalledWith(7));
  });

  it("a collection made private since is not linked, and a closed report has no action", async () => {
    admin.getCollectionReports.mockResolvedValue(list([
      { ...report, status: "resolved", collection: { ...report.collection, is_public: false } },
    ]));
    renderPanel();

    expect(await screen.findByText("Private now")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Bob's crates" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Resolve" })).not.toBeInTheDocument();
  });

  it("says when nothing is open", async () => {
    admin.getCollectionReports.mockResolvedValue(list([]));
    renderPanel();

    expect(await screen.findByText("No open report: every public collection looks fine.")).toBeInTheDocument();
  });
});
