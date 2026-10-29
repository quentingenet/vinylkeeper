import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AtlasSpotsByCountry from "@components/Atlas/AtlasSpotsByCountry";
import { groupSpotsByCountry } from "@components/Atlas/atlasSpotsGrouping";
import type { PlaceMapResponse } from "@services/AtlasApiService";

afterEach(cleanup);

let nextId = 1;
const spot = (name: string, city: string | undefined, country: string | undefined, placeType = "Record shop"): PlaceMapResponse => ({
  id: nextId++,
  latitude: 45.76,
  longitude: 4.84,
  name,
  city,
  country,
  place_type: placeType,
});

const spots = [
  spot("Sofa Records", "Lyon", "France"),
  spot("Le Bon Son", "Lyon", "France"),
  spot("Superfly", "Paris", "France"),
  spot("Jet Set", "Tokyo", "Japan"),
  spot("Disk Union", "Tokyo", "Japan"),
  spot("Union", "Osaka", "Japan"),
  spot("Nowhere", undefined, "France"),
];

describe("groupSpotsByCountry", () => {
  it("sorts countries and cities by number of spots, then by name, and spots by name", () => {
    const groups = groupSpotsByCountry(spots);

    expect(groups.map((g) => [g.country, g.count])).toEqual([["France", 3], ["Japan", 3]]);
    expect(groups[0].cities.map((c) => c.city)).toEqual(["Lyon", "Paris"]);
    expect(groups[0].cities[0].spots.map((s) => s.name)).toEqual(["Le Bon Son", "Sofa Records"]);
    expect(groups[1].cities.map((c) => c.city)).toEqual(["Tokyo", "Osaka"]);
  });

  it("leaves out the spots without a city or a country, as the map does", () => {
    const names = groupSpotsByCountry(spots).flatMap((g) => g.cities.flatMap((c) => c.spots.map((s) => s.name)));
    expect(names).not.toContain("Nowhere");
  });
});

describe("AtlasSpotsByCountry", () => {
  it("keeps every spot name in the page, closed countries included (search engines read them)", () => {
    render(<AtlasSpotsByCountry spots={spots} onSelectCity={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Spots by country" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "France" })).toBeInTheDocument();
    for (const name of ["Sofa Records", "Le Bon Son", "Superfly", "Jet Set", "Disk Union", "Union"]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });

  it("opens the spots of a city, as its marker does", async () => {
    const onSelectCity = vi.fn();
    render(<AtlasSpotsByCountry spots={spots} onSelectCity={onSelectCity} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /France/ }));
    await user.click(screen.getByRole("button", { name: /Lyon/ }));

    expect(onSelectCity).toHaveBeenCalledWith("France", "Lyon");
  });

  it("shows nothing while the Atlas has no spot", () => {
    const { container } = render(<AtlasSpotsByCountry spots={[]} onSelectCity={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
