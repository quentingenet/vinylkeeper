import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
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

const renderLandpage = (url = "/") =>
  render(
    <MemoryRouter initialEntries={[url]}>
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

  it("keeps the landing light: the tour of the app lives in the Atlas join popup", () => {
    renderLandpage();

    expect(screen.queryByRole("button", { name: /Take a look inside/ })).not.toBeInTheDocument();
    expect(screen.getByText("or")).toBeInTheDocument();
  });

  it("opens the sign up form from the link of the public Atlas", () => {
    renderLandpage("/?auth=register");
    expect(screen.getByRole("button", { name: "Join now" })).toBeInTheDocument();
  });

  it("opens the login form from the link of the public Atlas", () => {
    renderLandpage("/?auth=login");
    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
  });

  it("offers to just explore the Vinyl Atlas", () => {
    renderLandpage();
    expect(screen.getByRole("link", { name: "just explore the Vinyl Atlas" })).toHaveAttribute("href", "/atlas");
  });
});
