import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

const native = vi.hoisted(() => ({ value: true }));
vi.mock("@utils/CapacitorUtils", () => ({ isCapacitorPlatform: () => native.value }));

const launcher = vi.hoisted(() => ({ open: vi.fn() }));
vi.mock("@capacitor/core", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@capacitor/core")>()),
  registerPlugin: () => launcher,
}));
const browser = vi.hoisted(() => ({ open: vi.fn() }));
vi.mock("@capacitor/browser", () => ({ Browser: browser }));
vi.mock("@utils/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn() } }));

import StreamingLinksAccordion from "../StreamingLinksAccordion";

// The accordion is folded: its links are hidden until the summary is opened
const renderAccordion = () => {
  const view = render(<StreamingLinksAccordion itemTitle="Kind Of Blue" itemArtist="Miles Davis" itemType="album" />);
  fireEvent.click(screen.getByText("Listen on"));
  return view;
};

describe("StreamingLinksAccordion in the Android app", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    native.value = true;
    vi.stubEnv("VITE_SPOTIFY_WEB_URL", "https://open.spotify.com/search");
    vi.stubEnv("VITE_SPOTIFY_MOBILE_URL", "spotify:search");
    vi.stubEnv("VITE_DEEZER_WEB_URL", "https://www.deezer.com/search");
    vi.stubEnv("VITE_YOUTUBE_MUSIC_URL", "https://music.youtube.com/search");
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it("asks the system for the music app instead of following the link", () => {
    launcher.open.mockResolvedValue({ opened: "app" });
    renderAccordion();

    const notFollowed = fireEvent.click(screen.getByRole("link", { name: /Listen on Spotify/ }));

    expect(notFollowed).toBe(false);
    expect(launcher.open).toHaveBeenCalledWith({
      url: "spotify:search:Miles%20Davis%20Kind%20Of%20Blue",
      packageName: "com.spotify.music",
      fallbackUrl: "https://open.spotify.com/search/Miles%20Davis%20Kind%20Of%20Blue",
    });
  });

  it("opens the web page in a Custom Tab when the launcher fails", async () => {
    launcher.open.mockRejectedValue(new Error("not implemented"));
    renderAccordion();

    fireEvent.click(screen.getByRole("link", { name: /Listen on YouTube Music/ }));

    await vi.waitFor(() =>
      expect(browser.open).toHaveBeenCalledWith({
        url: "https://music.youtube.com/search?q=Miles%20Davis%20Kind%20Of%20Blue",
      })
    );
  });

  it("keeps a plain link in a browser: no launcher", () => {
    native.value = false;
    renderAccordion();

    fireEvent.click(screen.getByRole("link", { name: /Listen on Spotify/ }));

    expect(launcher.open).not.toHaveBeenCalled();
  });
});
