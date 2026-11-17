import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import i18n from "@utils/i18n";
import LanguageSection from "@components/Settings/LanguageSection";
import LanguageMenu from "@components/UI/LanguageMenu";
import type { LanguagePreference } from "@utils/i18n";

const api = vi.hoisted(() => ({ setLanguage: vi.fn() }));
vi.mock("@services/UserApiService", () => ({ userApiService: api }));

const session = vi.hoisted(() => ({
  isUserLoggedIn: true as boolean,
  currentUser: { username: "jane", user_uuid: "u-1", language: null as LanguagePreference } as {
    username: string;
    user_uuid: string;
    language: LanguagePreference;
  } | null,
  setCurrentUser: vi.fn(),
}));
vi.mock("@contexts/UserContext", () => ({ useUserContext: () => session }));

afterEach(async () => {
  cleanup();
  vi.clearAllMocks();
  session.isUserLoggedIn = true;
  session.currentUser = { username: "jane", user_uuid: "u-1", language: null };
  await i18n.changeLanguage("en");
});

const renderWithQueries = (ui: React.ReactNode) =>
  render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

const pick = async (option: string) => {
  await userEvent.click(screen.getByRole("combobox", { name: "Language" }));
  await userEvent.click(within(screen.getByRole("listbox")).getByRole("option", { name: option }));
};

describe("LanguageSection", () => {
  it("offers the device language and the six languages of the app", async () => {
    renderWithQueries(<LanguageSection />);

    await userEvent.click(screen.getByRole("combobox", { name: "Language" }));
    const options = within(screen.getByRole("listbox")).getAllByRole("option").map((option) => option.textContent);
    expect(options).toEqual(["Automatic (device)", "English", "Français", "Español", "Português", "Deutsch", "Italiano"]);
  });

  it("switches the interface at once, then saves the choice on the account", async () => {
    api.setLanguage.mockResolvedValue({ message: "ok" });
    renderWithQueries(<LanguageSection />);

    await pick("Français");

    expect(i18n.language).toBe("fr");
    expect(api.setLanguage).toHaveBeenCalledWith("fr");
    await vi.waitFor(() =>
      expect(session.setCurrentUser).toHaveBeenCalledWith(expect.objectContaining({ language: "fr" }))
    );
  });

  it("saves null for the language of the device", async () => {
    api.setLanguage.mockResolvedValue({ message: "ok" });
    session.currentUser = { username: "jane", user_uuid: "u-1", language: "es" };
    renderWithQueries(<LanguageSection />);

    await userEvent.click(screen.getByRole("combobox", { name: "Language" }));
    await userEvent.click(within(screen.getByRole("listbox")).getByRole("option", { name: "Automatic (device)" }));

    expect(api.setLanguage).toHaveBeenCalledWith(null);
  });

  it("goes back to the saved language when the save fails", async () => {
    api.setLanguage.mockRejectedValue(new Error("down"));
    renderWithQueries(<LanguageSection />);

    await pick("Português");

    await vi.waitFor(() => expect(i18n.language).toBe("en"));
    expect(await screen.findByText("The language could not be saved. Try again in a moment.")).toBeInTheDocument();
  });
});

describe("LanguageMenu", () => {
  it("shows the code of the language as text and changes it from a list", async () => {
    api.setLanguage.mockResolvedValue({ message: "ok" });
    renderWithQueries(<LanguageMenu />);

    const button = screen.getByRole("button", { name: "Language: English. Change the language" });
    expect(button).toHaveTextContent("EN");
    await userEvent.click(button);
    await userEvent.click(screen.getByRole("menuitem", { name: "Español" }));

    expect(i18n.language).toBe("es");
    expect(api.setLanguage).toHaveBeenCalledWith("es");
    expect(screen.getByRole("button", { name: "Idioma: Español. Cambiar el idioma" })).toHaveTextContent("ES");
  });

  it("only changes the page for a visitor: nothing to save, nothing stored", async () => {
    session.isUserLoggedIn = false;
    session.currentUser = null;
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    renderWithQueries(<LanguageMenu />);

    await userEvent.click(screen.getByRole("button", { name: /Change the language/ }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Français" }));

    expect(i18n.language).toBe("fr");
    expect(api.setLanguage).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
  });
});
