/** Discogs pages of the data VinylKeeper shows: its terms ask for a link next to that data. */
const DISCOGS_URL = "https://www.discogs.com";

/** Word for word the notice of the Discogs API Terms of Use (May 2025), which may live in the terms */
export const DISCOGS_HOME_URL = "https://www.discogs.com";

export const DISCOGS_DISCLAIMER =
  "This application uses Discogs’ API but is not affiliated with, sponsored or endorsed by Discogs. " +
  "‘Discogs’ is a trademark of Zink Media, LLC.";

const DISCOGS_ID = /^\d+$/;

/** A release (album) or artist page; Discogs itself when the id is not a Discogs one */
export function discogsPageUrl(kind: "album" | "artist", id: string | null | undefined): string {
  if (!id || !DISCOGS_ID.test(id)) return DISCOGS_URL;
  return `${DISCOGS_URL}/${kind === "album" ? "release" : "artist"}/${id}`;
}

/** The Discogs search matching what was searched in VinylKeeper */
export function discogsSearchUrl(query: string, isArtist: boolean): string {
  const params = new URLSearchParams({ q: query, type: isArtist ? "artist" : "release", format: "Vinyl" });
  if (isArtist) params.delete("format");
  return `${DISCOGS_URL}/search/?${params.toString()}`;
}

/** The collection of a connected Discogs account */
export function discogsCollectionUrl(username: string): string {
  return `${DISCOGS_URL}/user/${encodeURIComponent(username)}/collection`;
}
