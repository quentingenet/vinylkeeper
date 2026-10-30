import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CollectionStatsCard from "@components/Dashboard/CollectionStatsCard";
import type { CollectionBreakdown } from "@models/IDashboardStats";

const api = vi.hoisted(() => ({ getBreakdown: vi.fn() }));
vi.mock("@services/DashboardApiService", () => ({ dashboardApiService: api }));

const addRecord = vi.hoisted(() => ({ openAddRecord: vi.fn() }));
vi.mock("@contexts/AddRecordContext", () => ({ useAddRecord: () => addRecord }));

// Canvas charts do not draw in jsdom: one button per bar stands for a click on it
type ChartProps = {
  data: { labels: string[]; datasets: { data: number[] }[] };
  options?: { onClick?: (event: unknown, elements: { index: number }[]) => void };
};
vi.mock("react-chartjs-2", () => ({
  Bar: ({ data, options }: ChartProps) => (
    <div data-testid="bar-chart">
      {data.labels.map((label, index) => (
        <button key={label} onClick={() => options?.onClick?.({}, [{ index }])}>
          {label} {data.datasets[0].data[index]}
        </button>
      ))}
    </div>
  ),
  Doughnut: ({ data }: ChartProps) => <div data-testid="doughnut">{data.datasets[0].data.join(",")}</div>,
}));

const breakdown: CollectionBreakdown = {
  collection_id: null,
  collections: [
    { id: 7, name: "Jazz shelf" },
    { id: 8, name: "Sundays" },
  ],
  albums_total: 12,
  eras: [
    { decade: 1960, count: 5 },
    { decade: 1970, count: 7 },
  ],
  genres: [
    { label: "Jazz", count: 8 },
    { label: "Rock", count: 4 },
  ],
  moods: [{ label: "laid_back", count: 6 }],
  pressings: {
    originals: 6,
    reissues: 4,
    unknown: 2,
    countries: [{ label: "US", count: 9 }],
    formats: [{ label: "LP", count: 12 }],
  },
};

function SpinningNowProbe() {
  const location = useLocation();
  return <div data-testid="spinning-now">{JSON.stringify(location.state)}</div>;
}

const renderCard = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route
            path="/dashboard"
            element={<CollectionStatsCard community={{ albums: 30, artists: 20, places: 5 }} isMobile={false} />}
          />
          <Route path="/spinning-now" element={<SpinningNowProbe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );

beforeEach(() => {
  api.getBreakdown.mockResolvedValue(breakdown);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("CollectionStatsCard", () => {
  it("opens on the eras of all the collections", async () => {
    renderCard();

    expect(await screen.findByRole("button", { name: "1960s 5" })).toBeInTheDocument();
    expect(screen.getByText("Your collection in numbers")).toBeInTheDocument();
    expect(api.getBreakdown).toHaveBeenCalledWith(null);
  });

  it("a bar opens Spinning now on that era", async () => {
    renderCard();

    await userEvent.click(await screen.findByRole("button", { name: "1970s 7" }));

    expect(screen.getByTestId("spinning-now")).toHaveTextContent('{"filters":{"eras":[1970]}}');
  });

  it("one collection limits the stats and the Spinning now filters", async () => {
    api.getBreakdown.mockImplementation((id: number | null) =>
      Promise.resolve({ ...breakdown, collection_id: id, eras: [{ decade: 1950, count: 2 }] }));
    renderCard();

    await userEvent.click(await screen.findByRole("combobox", { name: "Collection" }));
    await userEvent.click(screen.getByRole("option", { name: "Sundays" }));
    await userEvent.click(await screen.findByRole("button", { name: "1950s 2" }));

    expect(api.getBreakdown).toHaveBeenLastCalledWith(8);
    expect(screen.getByTestId("spinning-now")).toHaveTextContent('{"filters":{"eras":[1950],"collections":[8]}}');
  });

  it("shows genres and moods by name, moods leading to Spinning now", async () => {
    renderCard();

    await userEvent.click(await screen.findByRole("tab", { name: "Genres" }));
    expect(screen.getByRole("button", { name: "Jazz 8" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: "Moods" }));
    await userEvent.click(screen.getByRole("button", { name: "Laid back 6" }));
    expect(screen.getByTestId("spinning-now")).toHaveTextContent('{"filters":{"moods":["laid_back"]}}');
  });

  it("shows originals against reissues and where records were pressed, as chips", async () => {
    renderCard();

    await userEvent.click(await screen.findByRole("tab", { name: "Pressings" }));

    expect(screen.getByText("Original pressings (50%)")).toBeInTheDocument();
    expect(screen.getByText("Reissues (33%)")).toBeInTheDocument();
    expect(screen.getByText("Year unknown (17%)")).toBeInTheDocument();
    expect(screen.getByText("US 9")).toBeInTheDocument();
    expect(screen.getByText("LP 12")).toBeInTheDocument();
  });

  it("keeps the community overview as a tab, without asking for it", async () => {
    renderCard();
    await screen.findByRole("button", { name: "1960s 5" });

    await userEvent.click(screen.getByRole("tab", { name: "Community" }));

    expect(screen.getByText("Community activity overview")).toBeInTheDocument();
    expect(screen.getByTestId("doughnut")).toHaveTextContent("30,20,5");
    expect(screen.queryByRole("combobox", { name: "Collection" })).not.toBeInTheDocument();
    expect(api.getBreakdown).toHaveBeenCalledTimes(1);
  });

  it("invites to add records when there are none", async () => {
    api.getBreakdown.mockResolvedValue({ ...breakdown, collections: [], albums_total: 0, eras: [] });
    renderCard();

    await userEvent.click(await screen.findByRole("button", { name: "Add your first vinyls" }));

    expect(addRecord.openAddRecord).toHaveBeenCalled();
    expect(screen.queryByTestId("bar-chart")).not.toBeInTheDocument();
  });

  it("says when the stats cannot be loaded", async () => {
    api.getBreakdown.mockRejectedValue(new Error("down"));
    renderCard();

    expect(await screen.findByText(/stats are unavailable/)).toBeInTheDocument();
    expect(within(screen.getByRole("tablist")).getAllByRole("tab")).toHaveLength(5);
  });
});
