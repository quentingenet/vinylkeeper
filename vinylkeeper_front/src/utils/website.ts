/**
 * A website entered by a user (spot of the Atlas), safe to link to: http or https only.
 * The API checks it already when the spot is saved; checked again here, where it becomes a link.
 */
export function safeWebsiteUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : null;
  } catch {
    return null;
  }
}

/** What the link shows: the domain, without "www." ("sofarecords.fr") */
export function websiteLabel(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "");
}
