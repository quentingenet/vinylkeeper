import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import App from "../App";

vi.mock("@contexts/UserContext", () => ({
  useUserContext: () => ({ isUserLoggedIn: true }),
}));
vi.mock("@components/Layout/Layout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@pages/Collections/CollectionsPage", () => ({
  default: function CollectionsPageMock() {
    const location = useLocation();
    return (
      <div data-testid="collections-page">{`${location.pathname}${location.search}`}</div>
    );
  },
}));

vi.mock("@pages/Atlas/Atlas", () => ({
  default: function AtlasMock() {
    const location = useLocation();
    return <div data-testid="atlas-page">{location.pathname}</div>;
  },
}));

afterEach(cleanup);

describe("App routing", () => {
  it("redirects the legacy /explore URL to the Community tab of Collections", async () => {
    render(
      <MemoryRouter initialEntries={["/explore"]}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByTestId("collections-page")).toHaveTextContent(
      "/collections?tab=community"
    );
  });

  it("renders the Collections page on /collections", async () => {
    render(
      <MemoryRouter initialEntries={["/collections"]}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByTestId("collections-page")).toHaveTextContent(
      "/collections"
    );
  });

  it("redirects the former /places URL to the Atlas", async () => {
    render(
      <MemoryRouter initialEntries={["/places"]}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByTestId("atlas-page")).toHaveTextContent("/atlas");
  });
});
