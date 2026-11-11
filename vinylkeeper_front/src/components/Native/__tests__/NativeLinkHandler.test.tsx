import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const native = vi.hoisted(() => ({ value: true }));
vi.mock("@utils/CapacitorUtils", () => ({
  isCapacitorPlatform: () => native.value,
}));

const appPlugin = vi.hoisted(() => ({
  listeners: [] as Array<(event: { url: string }) => void>,
  remove: vi.fn(),
  launchUrl: undefined as string | undefined,
}));
vi.mock("@capacitor/app", () => ({
  App: {
    addListener: vi.fn(
      (_event: string, callback: (event: { url: string }) => void) => {
        appPlugin.listeners.push(callback);
        return Promise.resolve({ remove: appPlugin.remove });
      },
    ),
    getLaunchUrl: vi.fn(() =>
      Promise.resolve(
        appPlugin.launchUrl ? { url: appPlugin.launchUrl } : undefined,
      ),
    ),
  },
}));

const browser = vi.hoisted(() => ({ close: vi.fn(() => Promise.resolve()) }));
vi.mock("@capacitor/browser", () => ({ Browser: browser }));

const api = vi.hoisted(() => ({ completeConnection: vi.fn() }));
vi.mock("@services/DiscogsImportApiService", () => ({
  discogsImportApiService: api,
}));
vi.mock("@utils/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn() } }));

import NativeLinkHandler from "../NativeLinkHandler";

const TOKEN = "0123456789abcdef0123456789abcdef";

function Where() {
  const location = useLocation();
  return <div data-testid="where">{location.pathname + location.search}</div>;
}

const renderHandler = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={["/dashboard"]}>
        <NativeLinkHandler />
        <Routes>
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

const open = (url: string) =>
  appPlugin.listeners.forEach((listener) => listener({ url }));
const where = (container: HTMLElement) =>
  container.querySelector("[data-testid=where]")?.textContent;

describe("NativeLinkHandler", () => {
  beforeEach(() => {
    native.value = true;
    appPlugin.listeners.length = 0;
    appPlugin.launchUrl = undefined;
    vi.clearAllMocks();
  });
  afterEach(cleanup);

  it("does nothing in a browser", async () => {
    native.value = false;
    renderHandler();
    expect(appPlugin.listeners).toHaveLength(0);
  });

  it("opens a shared collection from a link", async () => {
    const { container } = renderHandler();
    await waitFor(() => expect(appPlugin.listeners).toHaveLength(1));

    open(`https://vinylkeeper.org/shared/${TOKEN}`);

    await waitFor(() => expect(where(container)).toBe(`/shared/${TOKEN}`));
  });

  it("opens the link that started the app", async () => {
    appPlugin.launchUrl = `https://vinylkeeper.org/shared/${TOKEN}`;
    const { container } = renderHandler();

    await waitFor(() => expect(where(container)).toBe(`/shared/${TOKEN}`));
  });

  it("ignores a link that is not one of ours", async () => {
    const { container } = renderHandler();
    await waitFor(() => expect(appPlugin.listeners).toHaveLength(1));

    open("https://evil.example/shared/" + TOKEN);
    open("https://vinylkeeper.org/admin");

    expect(where(container)).toBe("/dashboard");
  });

  it("finishes the Discogs connection with the session of the app, then tells the dialog", async () => {
    api.completeConnection.mockResolvedValue({ connected: true });
    const { container } = renderHandler();
    await waitFor(() => expect(appPlugin.listeners).toHaveLength(1));

    open(
      "https://vinylkeeper.org/discogs/callback?oauth_token=t&oauth_verifier=v",
    );

    await waitFor(() =>
      expect(where(container)).toBe("/collections?discogs=connected"),
    );
    expect(api.completeConnection).toHaveBeenCalledWith("t", "v");
    expect(browser.close).toHaveBeenCalled();
  });

  it("tells the reason when the connection is refused", async () => {
    api.completeConnection.mockRejectedValue({
      code: 4000,
      message: "x",
      details: { reason: "session" },
    });
    const { container } = renderHandler();
    await waitFor(() => expect(appPlugin.listeners).toHaveLength(1));

    open(
      "https://vinylkeeper.org/discogs/callback?oauth_token=t&oauth_verifier=v",
    );

    await waitFor(() =>
      expect(where(container)).toBe("/collections?discogs=session"),
    );
  });

  it("falls back to a generic error", async () => {
    api.completeConnection.mockRejectedValue(new Error("offline"));
    const { container } = renderHandler();
    await waitFor(() => expect(appPlugin.listeners).toHaveLength(1));

    open(
      "https://vinylkeeper.org/discogs/callback?oauth_token=t&oauth_verifier=v",
    );

    await waitFor(() =>
      expect(where(container)).toBe("/collections?discogs=error"),
    );
  });

  it("says the connection was cancelled without asking the API", async () => {
    const { container } = renderHandler();
    await waitFor(() => expect(appPlugin.listeners).toHaveLength(1));

    open("https://vinylkeeper.org/discogs/callback?denied=t");

    await waitFor(() =>
      expect(where(container)).toBe("/collections?discogs=denied"),
    );
    expect(api.completeConnection).not.toHaveBeenCalled();
  });

  it("does not use a token twice when the same link is reported twice", async () => {
    api.completeConnection.mockResolvedValue({ connected: true });
    renderHandler();
    await waitFor(() => expect(appPlugin.listeners).toHaveLength(1));

    open(
      "https://vinylkeeper.org/discogs/callback?oauth_token=t&oauth_verifier=v",
    );
    open(
      "https://vinylkeeper.org/discogs/callback?oauth_token=t&oauth_verifier=v",
    );

    await waitFor(() =>
      expect(api.completeConnection).toHaveBeenCalledTimes(1),
    );
  });

  it("stops listening when it leaves", async () => {
    const { unmount } = renderHandler();
    await waitFor(() => expect(appPlugin.listeners).toHaveLength(1));
    unmount();
    await waitFor(() => expect(appPlugin.remove).toHaveBeenCalled());
  });
});
