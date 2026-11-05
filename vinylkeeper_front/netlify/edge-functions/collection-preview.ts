import { API_URL, isLinkPreviewBot, shareTokenFromPath, withCollectionPreview } from "./lib/collectionPreview.ts";

const API_TIMEOUT_MS = 2000;

interface EdgeContext {
  next: () => Promise<Response>;
}

/**
 * The preview of a shared collection, for link preview bots only: a visitor gets the app as usual.
 * Whatever goes wrong (private, deleted, API down), the bot gets the preview of the site.
 */
export default async function collectionPreview(request: Request, context: EdgeContext) {
  const shareToken = shareTokenFromPath(new URL(request.url).pathname);
  if (request.method !== "GET" || shareToken === null || !isLinkPreviewBot(request.headers.get("user-agent"))) {
    return context.next();
  }

  const page = await context.next();
  if (!page.ok) return page;

  try {
    const api = await fetch(`${API_URL}/collections/shared/${shareToken}`, {
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
    if (!api.ok) return page;
    const html = withCollectionPreview(await page.clone().text(), await api.json(), shareToken);
    const headers = new Headers(page.headers);
    headers.delete("content-length");
    return new Response(html, { status: page.status, headers });
  } catch {
    return page;
  }
}

export const config = { path: "/shared/*" };
