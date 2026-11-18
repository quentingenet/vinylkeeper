import { describe, it, expect, vi } from "vitest";
import { CollectionApiService } from "@services/CollectionApiService";

// The API routes declared on "/" of their router answer a redirect without their final slash, which the native
// request of the iOS app does not follow with its token: the app must call their exact path.
describe("CollectionApiService paths", () => {
  it("lists the collections of the member on the exact path of the API route", async () => {
    const service = new CollectionApiService();
    const get = vi.fn().mockResolvedValue({ items: [], total: 0, page: 2, limit: 10, total_pages: 0 });
    (service as unknown as { get: typeof get }).get = get;

    await service.getCollections(2, 10);

    expect(get).toHaveBeenCalledWith("/collections/?page=2&limit=10");
  });
});
