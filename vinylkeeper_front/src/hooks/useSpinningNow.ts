import { useCallback, useState } from "react";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { spinningNowApiService } from "@services/SpinningNowApiService";
import { queryKeys } from "@utils/queryKeys";
import type { SpinningNowAlbum, SpinningNowFilters } from "@models/ISpinningNow";

const NO_FILTERS: SpinningNowFilters = { moods: [], eras: [], genres: [], collections: [] };

function toggle<T>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
}

/** Filters, random results and "Surprise me" for the Spinning now page, optionally opened with some filters. */
export function useSpinningNow(initialFilters?: Partial<SpinningNowFilters>) {
  const [filters, setFilters] = useState<SpinningNowFilters>(() => ({ ...NO_FILTERS, ...initialFilters }));

  const optionsQuery = useQuery({
    queryKey: queryKeys.spinningNow.options(),
    queryFn: () => spinningNowApiService.getOptions(),
  });

  const hasAlbums = (optionsQuery.data?.total_albums ?? 0) > 0;

  const resultsQuery = useQuery({
    queryKey: queryKeys.spinningNow.pick(filters),
    queryFn: () => spinningNowApiService.pick(filters),
    enabled: hasAlbums,
    // Random by design: never serve a cached shuffle, but keep the previous one on screen while loading
    staleTime: 0,
    placeholderData: keepPreviousData,
  });

  const surprise = useMutation({
    mutationFn: async (): Promise<SpinningNowAlbum | null> =>
      (await spinningNowApiService.pick(filters, 1)).items[0] ?? null,
  });

  const toggleMood = useCallback((mood: string) => setFilters((f) => ({ ...f, moods: toggle(f.moods, mood) })), []);
  const toggleEra = useCallback((era: number) => setFilters((f) => ({ ...f, eras: toggle(f.eras, era) })), []);
  const toggleGenre = useCallback((genre: string) => setFilters((f) => ({ ...f, genres: toggle(f.genres, genre) })), []);
  const toggleCollection = useCallback(
    (id: number) => setFilters((f) => ({ ...f, collections: toggle(f.collections, id) })),
    []
  );
  const clearFilters = useCallback(() => setFilters(NO_FILTERS), []);

  const hasFilters =
    filters.moods.length + filters.eras.length + filters.genres.length + filters.collections.length > 0;

  return {
    filters,
    hasFilters,
    hasAlbums,
    optionsQuery,
    resultsQuery,
    surprise,
    toggleMood,
    toggleEra,
    toggleGenre,
    toggleCollection,
    clearFilters,
  };
}
