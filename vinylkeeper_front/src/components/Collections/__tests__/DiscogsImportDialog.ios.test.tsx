import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import DiscogsImportDialog from "@components/Collections/DiscogsImportDialog";

const api = vi.hoisted(() => ({ connection: vi.fn(), connect: vi.fn(), getCollections: vi.fn() }));
const sheet = vi.hoisted(() => ({ start: vi.fn() }));
const finish = vi.hoisted(() => vi.fn());
const navigate = vi.hoisted(() => vi.fn());
const browser = vi.hoisted(() => ({ open: vi.fn() }));

vi.mock("@services/DiscogsImportApiService", () => ({
  discogsImportApiService: { connection: api.connection, connect: api.connect, preview: vi.fn(), disconnect: vi.fn() },
}));
vi.mock("@services/CollectionApiService", () => ({ collectionApiService: { getCollections: api.getCollections } }));
vi.mock("@hooks/useDetectMobile", () => ({ default: () => ({ isMobile: true }) }));
vi.mock("@contexts/UserContext", () => ({ useUserContext: () => ({ currentUser: { user_uuid: "u-1" } }) }));
vi.mock("@utils/CapacitorUtils", () => ({ getPlatform: () => "ios", isCapacitorPlatform: () => true }));
vi.mock("@utils/DiscogsAuthSession", () => ({ DiscogsAuthSession: sheet }));
vi.mock("@hooks/useFinishDiscogsConnection", () => ({ useFinishDiscogsConnection: () => finish }));
vi.mock("@capacitor/browser", () => ({ Browser: browser }));
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useNavigate: () => navigate,
}));

const AUTHORIZE = "https://www.discogs.com/oauth/authorize?oauth_token=t";

const renderDialog = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <DiscogsImportDialog open onClose={vi.fn()} latestImport={null} onStart={vi.fn()} isStarting={false}
          startError={null} connectionOutcome={null} />
      </MemoryRouter>
    </QueryClientProvider>
  );

const clickConnect = async () => {
  await userEvent.click(await screen.findByRole("button", { name: "Connect with Discogs" }));
};

beforeEach(() => {
  vi.clearAllMocks();
  api.connection.mockResolvedValue({ available: true, connected: false, discogs_username: null, connected_at: null });
  api.getCollections.mockResolvedValue({ items: [], total: 0, page: 1, limit: 100, total_pages: 0 });
  api.connect.mockResolvedValue(AUTHORIZE);
});
afterEach(cleanup);

describe("DiscogsImportDialog on iOS", () => {
  it("opens Discogs in the sign-in sheet of iOS and finishes the connection with what it hands back", async () => {
    sheet.start.mockResolvedValue({ url: "org.vinylkeeper.app://discogs/callback?oauth_token=t&oauth_verifier=v" });
    renderDialog();

    await clickConnect();

    await waitFor(() => expect(finish).toHaveBeenCalledWith(
      { kind: "discogs-authorized", oauthToken: "t", oauthVerifier: "v" }));
    expect(api.connect).toHaveBeenCalledWith("ios");
    expect(sheet.start).toHaveBeenCalledWith({ url: AUTHORIZE });
    // Never the Custom Tab of Android
    expect(browser.open).not.toHaveBeenCalled();
  });

  it("a refusal on Discogs is told as such", async () => {
    sheet.start.mockResolvedValue({ url: "org.vinylkeeper.app://discogs/callback?denied=t" });
    renderDialog();

    await clickConnect();

    await waitFor(() => expect(finish).toHaveBeenCalledWith({ kind: "discogs-denied" }));
  });

  it("closing the sheet is a cancellation, any other failure an error", async () => {
    sheet.start.mockRejectedValueOnce({ code: "CANCELLED", message: "cancelled" });
    renderDialog();
    await clickConnect();
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/collections?discogs=denied"));

    sheet.start.mockRejectedValueOnce(new Error("boom"));
    await clickConnect();
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/collections?discogs=error"));
    expect(finish).not.toHaveBeenCalled();
  });
});
