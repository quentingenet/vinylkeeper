// @vitest-environment node
// ky builds a native Request: jsdom's AbortSignal would not be accepted by it
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import requestService from "@utils/RequestService";

const API = "https://api.test";

type Route = (request: Request) => Response | Promise<Response>;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

let calls: Request[];
// Bodies read at call time: a sent request's body can no longer be read
let bodies: string[];

/** Answers each call with the next route, recording the requests ky sends. */
const mockFetch = (...routes: Route[]) => {
  calls = [];
  bodies = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init);
    calls.push(request);
    bodies.push(await request.clone().text());
    const route = routes[calls.length - 1];
    if (!route) throw new Error(`Unexpected call to ${request.method} ${request.url}`);
    return route(request);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const setCookie = (cookie: string) => vi.stubGlobal("document", { cookie });

describe("requestService", () => {
  beforeEach(() => setCookie(""));
  afterEach(() => vi.unstubAllGlobals());

  describe("successful responses", () => {
    it("returns the parsed JSON and sends the cookies", async () => {
      mockFetch(() => json({ id: 1 }));

      const data = await requestService({ apiTarget: API, method: "GET", endpoint: "/albums/1" });

      expect(data).toEqual({ id: 1 });
      expect(calls[0].url).toBe(`${API}/albums/1`);
      expect(calls[0].method).toBe("GET");
      expect(calls[0].credentials).toBe("include");
    });

    it("sends the body as JSON", async () => {
      mockFetch(() => json({ ok: true }));

      await requestService({ apiTarget: API, method: "POST", endpoint: "/collections", body: { name: "Jazz" } });

      expect(calls[0].headers.get("content-type")).toContain("application/json");
      expect(JSON.parse(bodies[0])).toEqual({ name: "Jazz" });
    });

    it("returns null for a 204", async () => {
      mockFetch(() => new Response(null, { status: 204 }));

      await expect(requestService({ apiTarget: API, method: "DELETE", endpoint: "/albums/1" })).resolves.toBeNull();
    });

    it("returns the text of a text response", async () => {
      mockFetch(() => new Response("pong", { headers: { "content-type": "text/plain" } }));

      await expect(requestService({ apiTarget: API, method: "GET", endpoint: "/ping" })).resolves.toBe("pong");
    });
  });

  describe("CSRF", () => {
    it("sends the csrf_token cookie as the X-CSRF-Token header", async () => {
      setCookie("theme=dark; csrf_token=abc%3D123");
      mockFetch(() => json({}));

      await requestService({ apiTarget: API, method: "POST", endpoint: "/collections", body: {} });

      expect(calls[0].headers.get("X-CSRF-Token")).toBe("abc=123");
    });

    it("sends no header without the cookie", async () => {
      mockFetch(() => json({}));

      await requestService({ apiTarget: API, method: "POST", endpoint: "/collections", body: {} });

      expect(calls[0].headers.has("X-CSRF-Token")).toBe(false);
    });
  });

  describe("errors", () => {
    it("throws the ApiError sent by the API", async () => {
      const apiError = { code: 2001, message: "Collection name already exists", details: { field: "name" } };
      mockFetch(() => json(apiError, 409));

      await expect(
        requestService({ apiTarget: API, method: "POST", endpoint: "/collections", body: {} })
      ).rejects.toEqual(apiError);
    });

    it("keeps the HTTP status when the error body is not JSON", async () => {
      mockFetch(() => new Response("<html>Bad gateway</html>", { status: 502, headers: { "content-type": "text/html" } }));

      // A POST: ky does not retry it, unlike a GET on a 502
      const error = await requestService({ apiTarget: API, method: "POST", endpoint: "/collections", body: {} }).catch(
        (e: unknown) => e
      );

      expect(error).toMatchObject({ code: 502, details: {} });
    });

    it("keeps the HTTP status for a JSON error of another API", async () => {
      mockFetch(() => json({ error: "Unable to geocode" }, 400));

      await expect(
        requestService({ apiTarget: API, method: "GET", endpoint: "/reverse", skipRefresh: true })
      ).rejects.toMatchObject({ code: 400, details: {} });
    });

    it("turns a network failure into an ApiError", async () => {
      mockFetch(() => {
        throw new TypeError("Failed to fetch");
      });

      const error = await requestService({ apiTarget: API, method: "POST", endpoint: "/collections", body: {} }).catch(
        (e: unknown) => e
      );

      expect(error).toMatchObject({ code: 9999, details: {} });
    });

    it("rejects a call without endpoint before any request", async () => {
      const fetchMock = mockFetch();

      await expect(requestService({ apiTarget: API, method: "GET", endpoint: "" })).rejects.toMatchObject({ code: 9999 });
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("expired session", () => {
    const unauthorized = () => json({ code: 1004, message: "No access token provided", details: {} }, 401);

    it("refreshes the token then replays the request", async () => {
      mockFetch(unauthorized, () => json({ refreshed: true }), () => json({ id: 1 }));

      const data = await requestService({ apiTarget: API, method: "GET", endpoint: "/albums/1" });

      expect(data).toEqual({ id: 1 });
      expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
        `GET ${API}/albums/1`,
        `POST ${API}/users/refresh-token`,
        `GET ${API}/albums/1`,
      ]);
      expect(calls[1].credentials).toBe("include");
    });

    it("replays a POST with its body", async () => {
      mockFetch(unauthorized, () => json({}), () => json({ ok: true }));

      await requestService({ apiTarget: API, method: "POST", endpoint: "/collections", body: { name: "Jazz" } });

      expect(JSON.parse(bodies[2])).toEqual({ name: "Jazz" });
    });

    it("reports an expired session when the refresh fails", async () => {
      mockFetch(unauthorized, () => json({ code: 1004, message: "Invalid refresh token", details: {} }, 401));

      await expect(requestService({ apiTarget: API, method: "GET", endpoint: "/albums/1" })).rejects.toEqual({
        code: 401,
        message: "Session expired. Please log in again.",
        details: {},
      });
    });

    it("keeps the error of the replayed request after a successful refresh", async () => {
      const apiError = { code: 2001, message: "Collection name already exists", details: {} };
      mockFetch(unauthorized, () => json({}), () => json(apiError, 409));

      await expect(
        requestService({ apiTarget: API, method: "POST", endpoint: "/collections", body: {} })
      ).rejects.toEqual(apiError);
    });

    it("does not refresh twice when the replayed request is refused again", async () => {
      mockFetch(unauthorized, () => json({}), unauthorized);

      await expect(requestService({ apiTarget: API, method: "GET", endpoint: "/albums/1" })).rejects.toMatchObject({
        code: 401,
      });
      expect(calls).toHaveLength(3);
    });

    it("does not refresh with skipRefresh", async () => {
      mockFetch(unauthorized);

      await expect(
        requestService({ apiTarget: API, method: "POST", endpoint: "/users/login", body: {}, skipRefresh: true })
      ).rejects.toEqual({ code: 1004, message: "No access token provided", details: {} });
      expect(calls).toHaveLength(1);
    });

    it("shares one refresh between requests refused at the same time", async () => {
      mockFetch(unauthorized, unauthorized, () => json({}), () => json({ n: 1 }), () => json({ n: 2 }));

      await Promise.all([
        requestService({ apiTarget: API, method: "GET", endpoint: "/a" }),
        requestService({ apiTarget: API, method: "GET", endpoint: "/b" }),
      ]);

      expect(calls.filter((call) => call.url.endsWith("/users/refresh-token"))).toHaveLength(1);
    });
  });
});
