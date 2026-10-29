export type DiscogsImportStatus = "queued" | "running" | "done" | "failed";

export interface DiscogsImportPreview {
  discogs_username: string;
  /** Items of the Discogs collection, every format */
  items_total: number;
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
  error_message: string | null;
  created_at: string;
  finished_at: string | null;
}

// Same rule as the API: letters, digits, dots, hyphens and underscores
export const DISCOGS_USERNAME_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;

export const isImportActive = (job: DiscogsImport | null | undefined): boolean =>
  job?.status === "queued" || job?.status === "running";
