import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Landpage from "@pages/Landpage/Landpage";

vi.mock("@contexts/UserContext", () => ({
  useUserContext: () => ({
    isLoading: false,
    setIsLoading: vi.fn(),
    setIsUserLoggedIn: vi.fn(),
    setCurrentUser: vi.fn(),
  }),
}));
vi.mock("@components/Landpage/Background", () => ({ default: () => null }));

afterEach(cleanup);

const renderLandpage = () =>
  render(
    <MemoryRouter>
      <Landpage />
    </MemoryRouter>
  );

describe("Landpage", () => {
  it("shows a single Enter button instead of separate Login and Sign up buttons", () => {
    renderLandpage();

    expect(screen.getByRole("button", { name: "Enter" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Login" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign up" })).not.toBeInTheDocument();
  });

  it("opens the login form from Enter, then switches to sign up and back", async () => {
    const user = userEvent.setup();
    renderLandpage();

    await user.click(screen.getByRole("button", { name: "Enter" }));
    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sign up" }));
    expect(screen.getByRole("button", { name: "Join now" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Login" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Log in" }));
    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Join now" })).not.toBeInTheDocument();
  });

  it("opens the preview, and its Enter button leads to the login form", async () => {
    const user = userEvent.setup();
    renderLandpage();

    await user.click(screen.getByRole("button", { name: /Take a look inside/ }));
    const preview = screen.getByRole("dialog", { name: "A look inside VinylKeeper" });

    await user.click(within(preview).getByRole("button", { name: "Enter" }));

    expect(screen.queryByRole("dialog", { name: "A look inside VinylKeeper" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
  });
});
