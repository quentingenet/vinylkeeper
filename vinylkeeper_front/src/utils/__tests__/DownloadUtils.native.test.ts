import { describe, it, expect, vi, beforeEach } from "vitest";

const native = vi.hoisted(() => ({ value: true }));
vi.mock("../CapacitorUtils", () => ({ isCapacitorPlatform: () => native.value }));

const files = vi.hoisted(() => ({
  writeFile: vi.fn<(options: { path: string }) => Promise<{ uri: string }>>(),
  deleteFile: vi.fn(),
}));
vi.mock("@capacitor/filesystem", () => ({ Filesystem: files, Directory: { Cache: "CACHE" } }));
const share = vi.hoisted(() => ({ share: vi.fn() }));
vi.mock("@capacitor/share", () => ({ Share: share }));

import { deliverFile } from "../DownloadUtils";

describe("deliverFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    native.value = true;
    files.writeFile.mockResolvedValue({ uri: "file:///cache/exports/jazz.csv" });
    files.deleteFile.mockResolvedValue(undefined);
    share.share.mockResolvedValue({});
  });

  it("writes the file to the private cache, shares it, then removes it", async () => {
    await deliverFile(new Blob(["a;b"], { type: "text/csv" }), "jazz.csv");

    expect(files.writeFile).toHaveBeenCalledWith({
      path: "exports/jazz.csv",
      data: btoa("a;b"),
      directory: "CACHE",
      recursive: true,
    });
    expect(share.share).toHaveBeenCalledWith(expect.objectContaining({ url: "file:///cache/exports/jazz.csv" }));
    expect(files.deleteFile).toHaveBeenCalledWith({ path: "exports/jazz.csv", directory: "CACHE" });
  });

  it("keeps the file inside the cache folder whatever name the server sent", async () => {
    await deliverFile(new Blob(["x"]), "../../etc/pass wd.csv");
    const name = files.writeFile.mock.calls[0][0].path.replace(/^exports\//, "");
    // One file name: no separator left, so no way out of the folder
    expect(name).not.toMatch(/[\\/]/);
    expect(name).not.toMatch(/^\./);
    expect(name.endsWith("pass_wd.csv")).toBe(true);
  });

  it("does not report a closed share sheet as a failure, and still cleans up", async () => {
    share.share.mockRejectedValue(new Error("Share canceled"));
    await expect(deliverFile(new Blob(["x"]), "a.csv")).resolves.toBeUndefined();
    expect(files.deleteFile).toHaveBeenCalled();
  });

  it("reports a real failure, and still cleans up", async () => {
    share.share.mockRejectedValue(new Error("No app can handle this"));
    await expect(deliverFile(new Blob(["x"]), "a.csv")).rejects.toThrow("No app can handle this");
    expect(files.deleteFile).toHaveBeenCalled();
  });

  it("downloads in a browser, without touching the file system", async () => {
    native.value = false;
    const click = vi.fn();
    vi.spyOn(document, "createElement").mockReturnValueOnce({ click, remove: vi.fn(), style: {} } as never);
    vi.spyOn(document.body, "appendChild").mockImplementationOnce((node) => node);
    vi.stubGlobal("URL", { ...URL, createObjectURL: () => "blob:x", revokeObjectURL: vi.fn() });

    await deliverFile(new Blob(["x"]), "a.csv");

    expect(click).toHaveBeenCalled();
    expect(files.writeFile).not.toHaveBeenCalled();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
});
