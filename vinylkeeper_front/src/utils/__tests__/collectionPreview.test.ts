import { readFileSync } from "node:fs";
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  isLinkPreviewBot,
  shareTokenFromPath,
  withCollectionPreview,
  type SharedCollection,
} from "../../../netlify/edge-functions/lib/collectionPreview";
import collectionPreview from "../../../netlify/edge-functions/collection-preview";

const indexHtml = readFileSync("index.html", "utf8");

const TOKEN = "0123456789abcdef0123456789abcdef";

const collection: SharedCollection = {
  name: "Jazz shelf",
  description: "Blue Note first pressings",
  owner_username: "kent",
  records_count: 40,
  cover_url: "https://i.discogs.com/a.jpg",
};

const metaContent = (html: string, property: string) =>
  new RegExp(`<meta\\s+property="${property}"\\s+content="([^"]*)"`).exec(html)?.[1];

afterEach(() => vi.unstubAllGlobals());

describe("withCollectionPreview", () => {
  it("fills the preview tags of the real index.html", () => {
    const html = withCollectionPreview(indexHtml, collection, TOKEN);

    expect(html).toContain("<title>Jazz shelf | Vinyl Keeper</title>");
    expect(metaContent(html, "og:title")).toBe("Jazz shelf");
    expect(metaContent(html, "og:description")).toBe(
      "Have a look at kent&#39;s collection and discover vinylkeeper.org. 40 records. Blue Note first pressings"
    );
    expect(metaContent(html, "og:url")).toBe(`https://vinylkeeper.org/shared/${TOKEN}`);
    expect(metaContent(html, "og:image")).toContain("/images/proxy?src=https%3A%2F%2Fi.discogs.com%2Fa.jpg");
    expect(html.match(/property="og:title"/g)).toHaveLength(1);
  });

  it("keeps the image of the site for a collection without cover", () => {
    const html = withCollectionPreview(indexHtml, { ...collection, cover_url: null }, TOKEN);

    expect(metaContent(html, "og:image")).toBe("https://quentingenet.fr/vinylKeeper.png");
  });

  it("never lets the text of a member into the HTML", () => {
    const html = withCollectionPreview(indexHtml, {
      ...collection,
      name: '"><script>alert(1)</script> $& $1',
      description: null,
    }, TOKEN);

    expect(html).not.toContain("<script>alert(1)");
    expect(metaContent(html, "og:title")).toBe("&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt; $&amp; $1");
  });
});

describe("the requests it handles", () => {
  it("knows the bots of link previews from a browser", () => {
    expect(isLinkPreviewBot("WhatsApp/2.23.20.0 A")).toBe(true);
    expect(isLinkPreviewBot("facebookexternalhit/1.1")).toBe(true);
    expect(isLinkPreviewBot("Mozilla/5.0 (X11; Linux x86_64) Firefox/140.0")).toBe(false);
    expect(isLinkPreviewBot(null)).toBe(false);
  });

  it("reads the key of a shared link only", () => {
    expect(shareTokenFromPath(`/shared/${TOKEN}`)).toBe(TOKEN);
    expect(shareTokenFromPath("/shared/174")).toBeNull();
    expect(shareTokenFromPath("/collections/174")).toBeNull();
    expect(shareTokenFromPath(`/shared/${TOKEN}/records`)).toBeNull();
  });
});

describe("collectionPreview edge function", () => {
  const run = (userAgent: string) =>
    collectionPreview(
      new Request(`https://vinylkeeper.org/shared/${TOKEN}`, { headers: { "user-agent": userAgent } }),
      { next: () => Promise.resolve(new Response(indexHtml, { headers: { "content-type": "text/html" } })) }
    );

  it("leaves a visitor alone, without calling the API", async () => {
    const api = vi.fn();
    vi.stubGlobal("fetch", api);

    await run("Mozilla/5.0 Firefox/140.0");

    expect(api).not.toHaveBeenCalled();
  });

  it("gives a bot the preview of the collection", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(collection)));

    const html = await (await run("WhatsApp/2.23")).text();

    expect(metaContent(html, "og:title")).toBe("Jazz shelf");
  });

  it.each([
    ["a private collection", () => Promise.resolve(new Response("{}", { status: 403 }))],
    ["a deleted collection", () => Promise.resolve(new Response("{}", { status: 404 }))],
    ["the API down", () => Promise.reject(new Error("down"))],
  ])("keeps the preview of the site for %s", async (_case, answer) => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(answer));

    const html = await (await run("WhatsApp/2.23")).text();

    expect(html).toBe(indexHtml);
  });
});
