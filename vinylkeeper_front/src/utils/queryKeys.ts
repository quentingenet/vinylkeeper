export const queryKeys = {
  collections: {
    all: () => ["collections"] as const,
    forUser: (userUuid: string | undefined) => ["collections", userUuid] as const,
    list: (userUuid: string | undefined, page: number, itemsPerPage?: number) => ["collections", userUuid, page, itemsPerPage] as const,
    detail: (id: number) => ["collectionDetails", id] as const,
    public: {
      all: () => ["publicCollections"] as const,
      list: (page: number, sortBy: string) => ["publicCollections", page, sortBy] as const,
    },
    albums: (id: number) => ["collectionAlbums", id] as const,
    albumsPage: (id: number, page: number, sort: string) => ["collectionAlbums", id, page, sort] as const,
    artists: (id: number) => ["collectionArtists", id] as const,
    artistsPage: (id: number, page: number, sort: string) => ["collectionArtists", id, page, sort] as const,
    search: (id: number) => ["collectionSearch", id] as const,
    searchQuery: (id: number, term: string, searchType: string) => ["collectionSearch", id, term, searchType] as const,
  },
  places: {
    all: () => ["places"] as const,
    map: () => ["places-map"] as const,
    detail: (id: number) => ["placeDetails", id] as const,
    allByLocation: () => ["places-location"] as const,
    byLocation: (country: string | undefined, city: string | undefined) =>
      ["places-location", country, city] as const,
  },
  moderation: {
    all: () => ["moderation-requests"] as const,
    list: (page: number, limit: number) => ["moderation-requests", page, limit] as const,
    pending: () => ["pending-moderation-requests"] as const,
    pendingList: (page: number, limit: number) => ["pending-moderation-requests", page, limit] as const,
    stats: () => ["moderation-stats"] as const,
  },
  dashboard: {
    stats: () => ["dashboard-stats"] as const,
  },
  metadata: {
    album: (id: string | undefined) => ["albumMetadata", id] as const,
    artist: (id: string | undefined) => ["artistMetadata", id] as const,
  },
  wishlist: {
    all: () => ["wishlist"] as const,
    forUser: (userUuid: string | undefined) => ["wishlist", userUuid] as const,
    forUserPage: (userUuid: string | undefined, page: number, itemsPerPage?: number, sortOrder?: string, search?: string) =>
      ["wishlist", userUuid, page, itemsPerPage, sortOrder, search] as const,
    item: (id: number | null) => ["wishlistItem", id] as const,
  },
  userSettings: {
    all: () => ["userSettings"] as const,
    forUser: (userUuid: string | undefined) => ["userSettings", userUuid] as const,
  },
  search: {
    results: () => ["requestResults"] as const,
  },
};
