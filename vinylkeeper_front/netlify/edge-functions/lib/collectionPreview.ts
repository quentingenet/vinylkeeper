// Link previews (WhatsApp, Telegram, Slack...) read the HTML and run no JavaScript, so index.html
// alone would show the same preview for every collection. This fills it in for them.

export const API_URL = "https://api.vinylkeeper.org/api";
const SITE_URL = "https://vinylkeeper.org";
const PREVIEW_IMAGE_SIZE = 500;

const LINK_PREVIEW_BOTS =
  /whatsapp|facebookexternalhit|facebot|twitterbot|telegrambot|slackbot|linkedinbot|discordbot|skypeuripreview|pinterest|redditbot|mastodon|bluesky|cardyb/i;

export interface SharedCollection {
  name: string;
  description: string | null;
  owner_username: string | null;
  records_count: number;
  cover_url: string | null;
}

export const isLinkPreviewBot = (userAgent: string | null): boolean =>
  userAgent !== null && LINK_PREVIEW_BOTS.test(userAgent);

export const shareTokenFromPath = (pathname: string): string | null =>
  /^\/shared\/([0-9a-f]{32})\/?$/.exec(pathname)?.[1] ?? null;

const escapeHtml = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Replacers are functions: a "$&" in the name of a collection stays plain text. */
const setMeta = (html: string, attribute: string, key: string, content: string): string =>
  html.replace(
    new RegExp(`<meta\\s+${attribute}="${key}"\\s+content="[^"]*"\\s*/?>`),
    () => `<meta ${attribute}="${key}" content="${escapeHtml(content)}" />`
  );

const previewImage = (collection: SharedCollection): string | null => {
  const cover = collection.cover_url;
  if (!cover?.includes("i.discogs.com")) return null;
  const params = new URLSearchParams({
    src: cover,
    w: String(PREVIEW_IMAGE_SIZE),
    h: String(PREVIEW_IMAGE_SIZE),
    q: "85",
    cache: "true",
  });
  return `${API_URL}/images/proxy?${params.toString()}`;
};

/** index.html with the title, the text and the cover of a collection in its preview tags. */
export function withCollectionPreview(html: string, collection: SharedCollection, shareToken: string): string {
  const title = collection.name;
  const invitation = collection.owner_username
    ? `Have a look at ${collection.owner_username}'s collection and discover vinylkeeper.org`
    : "Have a look at this collection and discover vinylkeeper.org";
  const records = `${collection.records_count} record${collection.records_count === 1 ? "" : "s"}`;
  const description = [`${invitation}.`, `${records}.`, collection.description].filter(Boolean).join(" ");

  let page = html.replace(/<title>[^<]*<\/title>/, () => `<title>${escapeHtml(title)} | Vinyl Keeper</title>`);
  page = setMeta(page, "name", "description", description);
  page = setMeta(page, "property", "og:title", title);
  page = setMeta(page, "property", "og:description", description);
  page = setMeta(page, "property", "og:url", `${SITE_URL}/shared/${shareToken}`);

  // Without a cover, the image of the site stays
  const image = previewImage(collection);
  if (image) {
    page = setMeta(page, "property", "og:image", image);
    page = setMeta(page, "property", "og:image:secure_url", image);
    page = setMeta(page, "property", "og:image:width", String(PREVIEW_IMAGE_SIZE));
    page = setMeta(page, "property", "og:image:height", String(PREVIEW_IMAGE_SIZE));
    page = setMeta(page, "property", "og:image:alt", title);
    page = setMeta(page, "property", "og:image:type", "image/jpeg");
  }
  return page;
}
