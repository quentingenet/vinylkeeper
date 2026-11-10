import { describe, it, expect, vi, beforeEach } from "vitest";

const native = { value: false };
vi.mock("@utils/CapacitorUtils", () => ({ isCapacitorPlatform: () => native.value }));

const http = { get: vi.fn() };
vi.mock("@utils/CapacitorHttpService", () => ({ capacitorHttpService: http }));

const requestService = vi.fn();
vi.mock("@utils/RequestService", () => ({ default: requestService }));

const { fetchAlbumMetadata, fetchArtistMetadata } = await import("../MusicMetadataService");

describe("MusicMetadataService goes through the common client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    native.value = false;
  });

  it("asks the browser client, which sends the cookies and renews an expired session", async () => {
    requestService.mockResolvedValueOnce({ id: "12" });

    expect(await fetchAlbumMetadata({ id: "12", artist: "a", title: "t" })).toEqual({ id: "12" });
    expect(requestService.mock.calls[0][0]).toMatchObject({
      method: "GET",
      endpoint: "/request-proxy/music-metadata/album/12",
    });
  });

  it("asks the Android client, which sends the Bearer", async () => {
    native.value = true;
    http.get.mockResolvedValueOnce({ id: "7" });

    expect(await fetchArtistMetadata("7")).toEqual({ id: "7" });
    expect(http.get).toHaveBeenCalledWith("/request-proxy/music-metadata/artist/7", false);
    expect(requestService).not.toHaveBeenCalled();
  });

  it("says when an album is unknown", async () => {
    requestService.mockRejectedValueOnce({ code: 404, message: "Album not found", details: {} });
    await expect(fetchAlbumMetadata({ id: "99", artist: "a", title: "t" })).rejects.toThrow(
      "Album with ID 99 not found"
    );
  });

  it("does not call the API for an unknown artist", async () => {
    expect((await fetchArtistMetadata("Unknown Artist")).id).toBe("");
    expect(requestService).not.toHaveBeenCalled();
  });
});
