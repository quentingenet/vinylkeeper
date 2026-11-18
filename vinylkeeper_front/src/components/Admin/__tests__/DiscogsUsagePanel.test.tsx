import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DiscogsUsagePanel from "@components/Admin/DiscogsUsagePanel";
import { gaugeColor, usageShare } from "@components/Admin/discogsUsageGauge";
import type { DiscogsUsage } from "@services/AdminApiService";

const admin = vi.hoisted(() => ({ getDiscogsUsage: vi.fn() }));
vi.mock("@services/AdminApiService", () => ({ adminApiService: admin }));

const hours = Array.from({ length: 24 }, (_, i) => ({
  hour: new Date(Date.UTC(2026, 10, 17, 16 + i)).toISOString(),
  calls: i === 23 ? 412 : 10,
  rate_limited: i === 20 ? 2 : 0,
}));

const usage: DiscogsUsage = {
  current_hour: { calls: 412, rate_limited: 0, capacity: 3600 },
  last_24_hours: { calls: 642, rate_limited: 2, capacity: 86400 },
  by_source: [
    { source: "search", calls_current_hour: 300, calls_last_24_hours: 500, rate_limited_last_24_hours: 2 },
    { source: "price", calls_current_hour: 112, calls_last_24_hours: 142, rate_limited_last_24_hours: 0 },
    { source: "metadata", calls_current_hour: 0, calls_last_24_hours: 0, rate_limited_last_24_hours: 0 },
    { source: "import", calls_current_hour: 0, calls_last_24_hours: 0, rate_limited_last_24_hours: 0 },
    { source: "enrichment", calls_current_hour: 0, calls_last_24_hours: 0, rate_limited_last_24_hours: 0 },
    { source: "oauth", calls_current_hour: 0, calls_last_24_hours: 0, rate_limited_last_24_hours: 0 },
  ],
  hours,
  lowest_remaining: 3,
  delay_seconds: 60,
};

const renderPanel = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DiscogsUsagePanel />
    </QueryClientProvider>
  );

beforeEach(() => {
  admin.getDiscogsUsage.mockResolvedValue(usage);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("gauge", () => {
  it("fills with the share of the Discogs allowance and turns orange then red", () => {
    expect(usageShare({ calls: 1800, rate_limited: 0, capacity: 3600 })).toBe(0.5);
    expect(usageShare({ calls: 5000, rate_limited: 0, capacity: 3600 })).toBe(1);
    expect(usageShare({ calls: 0, rate_limited: 0, capacity: 0 })).toBe(0);
    expect([0.2, 0.5, 0.8].map(gaugeColor)).toEqual(["success", "warning", "error"]);
  });
});

describe("DiscogsUsagePanel", () => {
  it("shows the hour and the day against what Discogs allows", async () => {
    renderPanel();

    expect(await screen.findByText("412 of 3,600 calls")).toBeInTheDocument();
    expect(screen.getByText("642 of 86,400 calls")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "This hour" })).toHaveAttribute("aria-valuenow", "11");
    expect(screen.getByText("2 calls refused by Discogs (429) in 24 hours")).toBeInTheDocument();
    expect(screen.getByText("Lowest quota left seen: 3 calls per minute")).toBeInTheDocument();
    expect(screen.getByText("The counts can be up to 60 seconds late.")).toBeInTheDocument();
  });

  it("lists every part of the app that calls Discogs, the busiest first", async () => {
    renderPanel();

    const rows = (await screen.findAllByRole("row")).slice(1);
    expect(rows).toHaveLength(6);
    expect(within(rows[0]).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["Search", "300", "500", "2"]);
    expect(within(rows[1]).getByText("Collection value")).toBeInTheDocument();
    expect(screen.getByText("Nightly enrichment")).toBeInTheDocument();
  });

  it("says so when the usage cannot be read", async () => {
    admin.getDiscogsUsage.mockRejectedValue(new Error("down"));
    renderPanel();

    expect(await screen.findByText("The Discogs usage could not be loaded.")).toBeInTheDocument();
  });
});
