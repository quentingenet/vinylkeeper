export type DiscogsImportStatus = "queued" | "running" | "done" | "failed";

/** The Discogs account connected with OAuth: imports read it, never a typed username */
export interface DiscogsConnection {
  /** False while connecting a Discogs account is not configured on the server */
  available: boolean;
  connected: boolean;
  discogs_username: string | null;
  connected_at: string | null;
}

export interface DiscogsImportPreview {
  discogs_username: string;
  /** Items of the Discogs collection, every format */
  items_total: number;
  /** Items of the wantlist, every format; null when it cannot be read */
  wantlist_items_total: number | null;
  /** The wantlist is private: it cannot be imported */
  wantlist_private: boolean;
}

export interface DiscogsImport {
  id: number;
  /** null once the collection is deleted */
  collection_id: number | null;
  discogs_username: string;
  /** The collection was created for this import */
  created_collection: boolean;
  /** Copy saved before importing into an existing collection, null if none */
  saved_copy_collection_id: number | null;
  saved_copy_name: string | null;
  status: DiscogsImportStatus;
  pages_total: number;
  pages_done: number;
  items_total: number;
  vinyl_found: number;
  other_formats: number;
  added: number;
  copies_added: number;
  already_in_collection: number;
  /** Added releases whose work was already in the collection, another pressing */
  other_pressings: number;
  /** Added releases already in another collection of the user */
  in_other_collections: number;
  /** The wantlist goes into the wishlist after the collection, in the same import */
  include_wantlist: boolean;
  /** What pages_total and pages_done count */
  phase: "collection" | "wantlist";
  wantlist_items_total: number;
  wantlist_vinyl_found: number;
  wantlist_other_formats: number;
  wantlist_added: number;
  wantlist_already_in_wishlist: number;
  /** Skipped: this very pressing is in a collection */
  wantlist_owned: number;
  /** Added: another pressing of a record owned */
  wantlist_other_pressings_owned: number;
  /** Why the wantlist was not imported (the collection was) */
  wantlist_error: string | null;
  error_message: string | null;
  created_at: string;
  finished_at: string | null;
}

// Same rule as the API: letters, digits, dots, hyphens and underscores

export const isImportActive = (job: DiscogsImport | null | undefined): boolean =>
  job?.status === "queued" || job?.status === "running";
