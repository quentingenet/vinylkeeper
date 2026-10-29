import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import Atlas from "@pages/Atlas/Atlas";

const api = vi.hoisted(() => ({ getPlacesMap: vi.fn(), getPlacesByLocation: vi.fn() }));

vi.mock("@services/AtlasApiService", () => ({ atlasApiService: api }));
vi.mock("@hooks/useDetectMobile", () => ({ default: () => ({ isMobile: false }) }));
// Leaflet does not draw in jsdom: the real map component is kept, its map layers are not
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: ReactNode }) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  Marker: () => null,
}));

afterEach(cleanup);

describe.each([
  ["a member", false],
  ["a visitor", true],
])("The Atlas of %s", (_who, isPublic) => {
  it("lists the spots by country under the map", async () => {
    api.getPlacesMap.mockResolvedValue([
      { id: 1, latitude: 45.76, longitude: 4.84, city: "Lyon", country: "France", name: "Sofa Records", place_type: "Record shop" },
    ]);

    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <Atlas isPublic={isPublic} />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByRole("heading", { name: "Spots by country" })).toBeInTheDocument();
    expect(screen.getByTestId("map")).toBeInTheDocument();
    expect(screen.getByText("Sofa Records")).toBeInTheDocument();
  });
});
