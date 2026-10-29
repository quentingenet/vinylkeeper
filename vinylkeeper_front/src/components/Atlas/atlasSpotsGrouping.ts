import type { PlaceMapResponse } from "@services/AtlasApiService";

export interface CityGroup {
  city: string;
  spots: PlaceMapResponse[];
}

export interface CountryGroup {
  country: string;
  count: number;
  cities: CityGroup[];
}

const bySizeThenName = <T,>(size: (item: T) => number, name: (item: T) => string) =>
  (a: T, b: T) => size(b) - size(a) || name(a).localeCompare(name(b));

/**
 * The spots of the map by country, then city: most spots first. Spots without a city or a
 * country are left out, as on the map, where they cannot be opened either.
 */
export function groupSpotsByCountry(spots: PlaceMapResponse[]): CountryGroup[] {
  const countries = new Map<string, Map<string, PlaceMapResponse[]>>();
  for (const spot of spots) {
    if (!spot.country || !spot.city) continue;
    const cities = countries.get(spot.country) ?? new Map<string, PlaceMapResponse[]>();
    cities.set(spot.city, [...(cities.get(spot.city) ?? []), spot]);
    countries.set(spot.country, cities);
  }
  return Array.from(countries, ([country, cities]) => {
    const cityGroups = Array.from(cities, ([city, citySpots]) => ({
      city,
      spots: [...citySpots].sort((a, b) => a.name.localeCompare(b.name)),
    })).sort(bySizeThenName((group: CityGroup) => group.spots.length, (group) => group.city));
    return { country, count: cityGroups.reduce((total, group) => total + group.spots.length, 0), cities: cityGroups };
  }).sort(bySizeThenName((group: CountryGroup) => group.count, (group) => group.country));
}
