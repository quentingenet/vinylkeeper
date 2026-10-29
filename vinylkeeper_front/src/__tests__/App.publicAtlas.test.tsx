import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import App from "../App";

// A visitor: no session
vi.mock("@contexts/UserContext", () => ({
  useUserContext: () => ({ isUserLoggedIn: false }),
}));
vi.mock("@pages/Atlas/Atlas", () => ({
  default: function AtlasMock({ isPublic }: { isPublic?: boolean }) {
    const location = useLocation();
    return <div data-testid="atlas-page">{`${location.pathname} public=${String(isPublic)}`}</div>;
  },
}));
vi.mock("@pages/Landpage/Landpage", () => ({ default: () => <div data-testid="landpage" /> }));

afterEach(cleanup);

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <App />
    </MemoryRouter>
  );

describe("Public Atlas", () => {
  it("is open to visitors, read only, with Log in and Sign up links to the home page", async () => {
    renderAt("/atlas");

    expect(await screen.findByTestId("atlas-page", {}, { timeout: 3000 })).toHaveTextContent("/atlas public=true");
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/?auth=login");
    expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute("href", "/?auth=register");
    // The footer of the home page, with its terms and its presentation
    expect(screen.getByText(/Terms and conditions/)).toBeInTheDocument();
    expect(screen.getByText(/by Quentin Genet/)).toBeInTheDocument();
  });

  it("is reached from the former /places URL", async () => {
    renderAt("/places");
    expect(await screen.findByTestId("atlas-page", {}, { timeout: 3000 })).toHaveTextContent("/atlas public=true");
  });

  it("leaves every other page of the app closed to visitors", async () => {
    renderAt("/dashboard");
    expect(await screen.findByTestId("landpage", {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.queryByTestId("atlas-page")).not.toBeInTheDocument();
  });
});
