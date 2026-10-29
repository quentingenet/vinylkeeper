import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

describe("A spot of the Atlas", () => {
  it("links to its website when it has one, in a new tab", async () => {
    api.getPlacesMap.mockResolvedValue([
      { id: 1, latitude: 45.76, longitude: 4.84, city: "Lyon", country: "France", name: "Sofa Records", place_type: "Record shop" },
      { id: 2, latitude: 45.76, longitude: 4.84, city: "Lyon", country: "France", name: "Le Bon Son", place_type: "Record shop" },
    ]);
    api.getPlacesByLocation.mockResolvedValue([
      { id: 1, name: "Sofa Records", address: "1 rue X", city: "Lyon", country: "France", description: "Soul and funk",
        source_url: "https://www.sofarecords.fr/shop", place_type: { id: 1, name: "Record shop" }, likes_count: 3, is_liked: false },
      { id: 2, name: "Le Bon Son", address: "2 rue Y", city: "Lyon", country: "France", description: "Jazz",
        source_url: null, place_type: { id: 1, name: "Record shop" }, likes_count: 0, is_liked: false },
    ]);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <Atlas />
        </MemoryRouter>
      </QueryClientProvider>
    );
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /France/ }));
    await user.click(screen.getByRole("button", { name: /Lyon/ }));
    await user.click(await screen.findByText(/Sofa Records/, { selector: "h6" }));

    const link = await screen.findByRole("link", { name: "sofarecords.fr" });
    expect(link).toHaveAttribute("href", "https://www.sofarecords.fr/shop");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer nofollow ugc");
    expect(screen.getAllByRole("link")).toHaveLength(1); // Le Bon Son has no website
  });
});
