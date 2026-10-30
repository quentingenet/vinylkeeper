import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { usePreloadedImages } from "@hooks/usePreloadedImages";

// A browser image whose decoding the test settles by hand
let decodes: { url: string; resolve: () => void; reject: () => void }[] = [];
class FakeImage {
  src = "";
  decode() {
    return new Promise<void>((resolve, reject) => decodes.push({ url: this.src, resolve, reject }));
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  decodes = [];
});

describe("usePreloadedImages", () => {
  it("is ready once every image is decoded", async () => {
    vi.stubGlobal("Image", FakeImage);
    const { result } = renderHook(() => usePreloadedImages(["/a.webp", "/b.webp"]));

    await waitFor(() => expect(decodes).toHaveLength(2));
    decodes[0].resolve();
    expect(result.current).toBe(false);
    decodes[1].resolve();
    await waitFor(() => expect(result.current).toBe(true));
  });

  it("does not block on an image that fails", async () => {
    vi.stubGlobal("Image", FakeImage);
    const { result } = renderHook(() => usePreloadedImages(["/missing.webp"]));

    await waitFor(() => expect(decodes).toHaveLength(1));
    decodes[0].reject();
    await waitFor(() => expect(result.current).toBe(true));
  });

  it("waits until it is enabled", async () => {
    vi.stubGlobal("Image", FakeImage);
    const { result, rerender } = renderHook(({ enabled }) => usePreloadedImages(["/a.webp"], enabled), {
      initialProps: { enabled: false },
    });
    expect(decodes).toHaveLength(0);

    rerender({ enabled: true });
    await waitFor(() => expect(decodes).toHaveLength(1));
    decodes[0].resolve();
    await waitFor(() => expect(result.current).toBe(true));
  });
});
