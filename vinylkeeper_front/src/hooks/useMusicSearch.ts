import { useCallback, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { searchApiService } from "@services/SearchApiService";
import type { DiscogsData, IRequestToSend } from "@models/IRequestProxy";
import { queryKeys } from "@utils/queryKeys";

type SearchRequest = Required<IRequestToSend>;

// Same limit as the API: shorter queries are refused before any request
export const MIN_QUERY_LENGTH = 2;

// Artists have a name, albums a title: cards only read the title
const withTitle = (item: DiscogsData): DiscogsData => ({ ...item, title: item.title || item.name || "" });

export function useMusicSearch() {
  const [request, setRequest] = useState<SearchRequest | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);

  const resultsQuery = useQuery({
    queryKey: queryKeys.search.page(request?.query ?? "", request?.is_artist ?? false, request?.page ?? 1),
    queryFn: async ({ queryKey: [, query, is_artist, page] }) => {
      const results = await searchApiService.searchMusicPage({ query, is_artist, page });
      // Kept with the data: previous results stay on screen while a search of the other type loads
      return { ...results, items: results.items.map(withTitle), isArtist: is_artist };
    },
    enabled: request !== null,
    // Same as before pagination: a failed search is reported, not silently retried
    retry: false,
    // Previous results stay on screen while the next page or search loads
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });

  const search = useCallback((query: string, isArtist: boolean) => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setInputError(`Type at least ${MIN_QUERY_LENGTH} characters to search.`);
      return;
    }
    setInputError(null);
    setRequest({ query: trimmed, is_artist: isArtist, page: 1 });
  }, []);

  const goToPage = (page: number) => setRequest((current) => (current ? { ...current, page } : current));

  // Before the first search of this visit the query is idle: whatever its cache key holds
  // (an error from a previous visit, for instance) must not show up
  const hasSearched = request !== null;
  const searchError = hasSearched && resultsQuery.isError ? resultsQuery.error.message : null;

  return {
    results: hasSearched ? resultsQuery.data : undefined,
    isSearching: hasSearched && resultsQuery.isFetching,
    isChangingPage: hasSearched && resultsQuery.isPlaceholderData,
    error: inputError ?? searchError ?? undefined,
    search,
    goToPage,
  };
}
