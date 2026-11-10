import { describe, it, expect } from "vitest";
import { discogsOutcomeUrl, parseAppLink } from "../NativeLinks";

const TOKEN = "0123456789abcdef0123456789abcdef";

describe("parseAppLink", () => {
  it("opens the page of a shared collection", () => {
    expect(parseAppLink(`https://vinylkeeper.org/shared/${TOKEN}`)).toEqual({ kind: "page", path: `/shared/${TOKEN}` });
    expect(parseAppLink(`https://vinylkeeper.org/shared/${TOKEN}/?utm=x`)).toEqual({
      kind: "page",
      path: `/shared/${TOKEN}`,
    });
  });

  it("refuses a key that is not one", () => {
    expect(parseAppLink("https://vinylkeeper.org/shared/not-a-key")).toBeNull();
    expect(parseAppLink(`https://vinylkeeper.org/shared/${TOKEN.toUpperCase()}`)).toBeNull();
    expect(parseAppLink(`https://vinylkeeper.org/shared/${TOKEN}/records`)).toBeNull();
  });

  it("reads what Discogs sends back after the authorization", () => {
    expect(parseAppLink("https://vinylkeeper.org/discogs/callback?oauth_token=t&oauth_verifier=v")).toEqual({
      kind: "discogs-authorized",
      oauthToken: "t",
      oauthVerifier: "v",
    });
  });

  it("reads a refusal on the Discogs page", () => {
    expect(parseAppLink("https://vinylkeeper.org/discogs/callback?denied=t")).toEqual({ kind: "discogs-denied" });
  });

  it("ignores an incomplete or oversized return from Discogs", () => {
    expect(parseAppLink("https://vinylkeeper.org/discogs/callback?oauth_token=t")).toBeNull();
    expect(parseAppLink("https://vinylkeeper.org/discogs/callback")).toBeNull();
    expect(parseAppLink(`https://vinylkeeper.org/discogs/callback?oauth_token=${"a".repeat(256)}&oauth_verifier=v`)).toBeNull();
  });

  it("never picks a page of the app: only the two known links open", () => {
    expect(parseAppLink("https://vinylkeeper.org/settings")).toBeNull();
    expect(parseAppLink("https://vinylkeeper.org/admin")).toBeNull();
  });

  it("only trusts https on the site's own host", () => {
    expect(parseAppLink(`http://vinylkeeper.org/shared/${TOKEN}`)).toBeNull();
    expect(parseAppLink(`https://evil.example/shared/${TOKEN}`)).toBeNull();
    expect(parseAppLink(`https://vinylkeeper.org.evil.example/shared/${TOKEN}`)).toBeNull();
    expect(parseAppLink(`https://user@evil.example/shared/${TOKEN}`)).toBeNull();
    expect(parseAppLink("vinylkeeper://shared/x")).toBeNull();
    expect(parseAppLink("not a url")).toBeNull();
  });
});

describe("discogsOutcomeUrl", () => {
  it("goes to the collections page, where the import dialog tells the outcome", () => {
    expect(discogsOutcomeUrl("connected")).toBe("/collections?discogs=connected");
    expect(discogsOutcomeUrl("a&b")).toBe("/collections?discogs=a%26b");
  });
});
