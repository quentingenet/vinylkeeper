import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Settings from "@pages/Settings/Settings";

const api = vi.hoisted(() => ({
  getCurrentUserSettings: vi.fn(),
  setLanguage: vi.fn(),
  setCurrency: vi.fn(),
}));
vi.mock("@services/UserApiService", () => ({ userApiService: api }));
vi.mock("@contexts/UserContext", () => ({
  useUserContext: () => ({
    isUserLoggedIn: true,
    currentUser: { username: "jane", user_uuid: "u-1", language: null },
    setCurrentUser: vi.fn(),
    logout: vi.fn(),
  }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const renderAt = (url = "/settings") => {
  api.getCurrentUserSettings.mockResolvedValue({
    username: "jane",
    email: "jane@example.com",
    user_uuid: "u-1",
    created_at: "2026-01-01T00:00:00Z",
    is_accepted_terms: true,
    is_email_confirmed: true,
    preferred_currency: "EUR",
    language: null,
  });
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[url]}>
        <Settings />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe("Settings tabs", () => {
  it("opens on the profile: email, password and account deletion", async () => {
    renderAt();

    expect(await screen.findByRole("tab", { name: "Profile", selected: true })).toBeInTheDocument();
    expect(await screen.findByText("Email address")).toBeInTheDocument();
    expect(screen.getByText("Change password")).toBeInTheDocument();
    expect(screen.getByText("Danger zone")).toBeInTheDocument();
    expect(screen.queryByText("Collection value")).not.toBeInTheDocument();
  });

  it("puts the currency and the language under App settings", async () => {
    renderAt();

    await userEvent.click(await screen.findByRole("tab", { name: "App settings" }));

    expect(await screen.findByText("Collection value")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Language" })).toBeInTheDocument();
    expect(screen.queryByText("Danger zone")).not.toBeInTheDocument();
  });

  it("opens App settings from its link", async () => {
    renderAt("/settings?tab=app");
    expect(await screen.findByRole("tab", { name: "App settings", selected: true })).toBeInTheDocument();
  });

  it("keeps the support in reach on both tabs", async () => {
    renderAt();
    expect(await screen.findByRole("button", { name: "Contact support" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: "App settings" }));
    expect(screen.getByRole("button", { name: "Contact support" })).toBeInTheDocument();
  });
});
