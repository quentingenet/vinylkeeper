import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UserContextProvider, useUserContext } from "@contexts/UserContext";

const api = vi.hoisted(() => ({ refreshToken: vi.fn(), getCurrentUser: vi.fn(), logout: vi.fn() }));
vi.mock("@services/UserApiService", () => ({ userApiService: api }));
vi.mock("@utils/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

const SESSION_KEY = "vk_has_session";
const user = { user_uuid: "u-1", username: "jane" };

function Probe() {
  const { isUserLoggedIn, currentUser } = useUserContext();
  return (
    <p>
      state:{String(isUserLoggedIn)} user:{currentUser?.username ?? "none"}
    </p>
  );
}

const renderProvider = (queryClient = new QueryClient()) =>
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <UserContextProvider>
          <Probe />
        </UserContextProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );

/** Lets the pending promises of the provider settle. */
const flush = () => act(async () => {});

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("UserContextProvider session check", () => {
  it("is logged out at once without the session flag", async () => {
    renderProvider();
    await flush();

    expect(screen.getByText(/state:false/)).toBeInTheDocument();
    expect(api.refreshToken).not.toHaveBeenCalled();
  });

  it("logs the user in when the refresh succeeds", async () => {
    localStorage.setItem(SESSION_KEY, "1");
    api.refreshToken.mockResolvedValue({ isLoggedIn: true });
    api.getCurrentUser.mockResolvedValue(user);

    renderProvider();
    await flush();

    expect(screen.getByText("state:true user:jane")).toBeInTheDocument();
    expect(localStorage.getItem(SESSION_KEY)).toBe("1");
  });

  it("logs out and clears the cache when the server refuses the refresh", async () => {
    localStorage.setItem(SESSION_KEY, "1");
    api.refreshToken.mockRejectedValue({ code: 1004, message: "Invalid refresh token", details: {} });
    const queryClient = new QueryClient();
    queryClient.setQueryData(["collections"], ["cached"]);

    renderProvider(queryClient);
    await flush();

    expect(screen.getByText(/state:false/)).toBeInTheDocument();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(queryClient.getQueryData(["collections"])).toBeUndefined();
  });

  it("keeps the session at startup when the network fails, then retries", async () => {
    localStorage.setItem(SESSION_KEY, "1");
    api.refreshToken.mockRejectedValueOnce({ code: 9999, message: "Failed to fetch", details: {} });
    api.refreshToken.mockResolvedValue({ isLoggedIn: true });
    api.getCurrentUser.mockResolvedValue(user);

    renderProvider();
    await flush();

    // Still unknown: the loader stays, the session flag is kept
    expect(screen.getByText(/state:null/)).toBeInTheDocument();
    expect(localStorage.getItem(SESSION_KEY)).toBe("1");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(screen.getByText("state:true user:jane")).toBeInTheDocument();
  });

  it("keeps a logged-in user logged in when a periodic refresh hits a server error", async () => {
    localStorage.setItem(SESSION_KEY, "1");
    api.refreshToken.mockResolvedValueOnce({ isLoggedIn: true });
    api.getCurrentUser.mockResolvedValue(user);
    // Kept past the 25 minutes even without an observer: only a logout may drop it
    const queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });

    renderProvider(queryClient);
    await flush();
    expect(screen.getByText("state:true user:jane")).toBeInTheDocument();

    queryClient.setQueryData(["collections"], ["cached"]);
    api.refreshToken.mockRejectedValue({ code: 502, message: "Bad gateway", details: {} });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(25 * 60 * 1000);
    });

    expect(api.refreshToken).toHaveBeenCalledTimes(2);
    expect(screen.getByText("state:true user:jane")).toBeInTheDocument();
    expect(localStorage.getItem(SESSION_KEY)).toBe("1");
    expect(queryClient.getQueryData(["collections"])).toEqual(["cached"]);
  });

  it("logs out when the current user can no longer be read because the session is refused", async () => {
    localStorage.setItem(SESSION_KEY, "1");
    api.refreshToken.mockResolvedValue({ isLoggedIn: true });
    api.getCurrentUser.mockRejectedValue({ code: 401, message: "Session expired. Please log in again.", details: {} });

    renderProvider();
    await flush();

    expect(screen.getByText(/state:false/)).toBeInTheDocument();
  });
});
