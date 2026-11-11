import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

const api = vi.hoisted(() => ({ getStats: vi.fn() }));
vi.mock("@services/DashboardApiService", () => ({ dashboardApiService: api }));
vi.mock("@contexts/UserContext", () => ({ useUserContext: () => ({ currentUser: { user_uuid: "u", username: "john", is_tutorial_seen: true, number_of_connections: 9 } }) }));
vi.mock("@contexts/AddRecordContext", () => ({ useAddRecord: () => ({ openAddRecord: vi.fn() }) }));
// Charts and the value card are not what is tested here (canvas, their own requests)
vi.mock("@components/Dashboard/CollectionStatsCard", () => ({ default: () => null }));
vi.mock("@components/Dashboard/CollectionValueCard", () => ({ default: () => null }));
vi.mock("@components/Modals/PlaybackModal", () => ({ default: () => null }));
vi.mock("@components/Modals/TutorialModal", () => ({ default: () => null }));

import Dashboard from "../Dashboard";

const stats = (overrides: object) => ({
  user_albums_total: 0,
  user_artists_total: 0,
  user_collections_total: 1,
  user_public_collections_total: 0,
  global_albums_total: 10,
  global_artists_total: 5,
  moderated_places_total: 28,
  global_places_total: 30,
  public_collections_total: 2,
  latest_album: null,
  latest_artist: null,
  recent_albums: [],
  ...overrides,
});

const renderDashboard = (overrides: object) => {
  api.getStats.mockResolvedValue(stats(overrides));
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Dashboard of a new member", () => {
  it("replaces the two empty counters by the Atlas and an invitation", async () => {
    renderDashboard({});

    expect(await screen.findByText("Start your collection")).toBeInTheDocument();
    expect(screen.queryByText("My albums")).not.toBeInTheDocument();
    expect(screen.queryByText("My artists")).not.toBeInTheDocument();
    expect(screen.getByText("Atlas spots")).toBeInTheDocument();
  });

  it("shows the three counters once there is a record", async () => {
    renderDashboard({ user_albums_total: 3 });

    expect(await screen.findByText("My albums")).toBeInTheDocument();
    expect(screen.getByText("My artists")).toBeInTheDocument();
    expect(screen.getByText("Atlas spots")).toBeInTheDocument();
    expect(screen.queryByText("Start your collection")).not.toBeInTheDocument();
  });

  it("shows the three counters with an artist only", async () => {
    renderDashboard({ user_artists_total: 1 });

    expect(await screen.findByText("My albums")).toBeInTheDocument();
    expect(screen.queryByText("Start your collection")).not.toBeInTheDocument();
  });
});
