import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import CollectionsPage from "@pages/Collections/CollectionsPage";

vi.mock("@components/Collections/MyCollectionsPanel", () => ({
  default: () => <div data-testid="my-collections-panel" />,
}));
vi.mock("@components/Collections/CommunityCollectionsPanel", () => ({
  default: () => <div data-testid="community-collections-panel" />,
}));

afterEach(cleanup);

function LocationDisplay() {
  const location = useLocation();
  return (
    <div data-testid="location">{`${location.pathname}${location.search}`}</div>
  );
}

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <CollectionsPage />
      <LocationDisplay />
    </MemoryRouter>
  );

describe("CollectionsPage", () => {
  it("opens My collections by default", () => {
    renderAt("/collections");

    expect(screen.getByTestId("my-collections-panel")).toBeInTheDocument();
    expect(
      screen.queryByTestId("community-collections-panel")
    ).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "My collections" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("opens Community when ?tab=community is in the URL", () => {
    renderAt("/collections?tab=community");

    expect(
      screen.getByTestId("community-collections-panel")
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("my-collections-panel")
    ).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Community" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("falls back to My collections for an unknown tab value", () => {
    renderAt("/collections?tab=unknown");

    expect(screen.getByTestId("my-collections-panel")).toBeInTheDocument();
  });

  it("updates the URL when switching tabs", async () => {
    const user = userEvent.setup();
    renderAt("/collections");

    await user.click(screen.getByRole("tab", { name: "Community" }));
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/collections?tab=community"
    );
    expect(
      screen.getByTestId("community-collections-panel")
    ).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "My collections" }));
    expect(screen.getByTestId("location").textContent).toBe("/collections");
    expect(screen.getByTestId("my-collections-panel")).toBeInTheDocument();
  });

  it("starts the other tab at its first page and default sort", async () => {
    const user = userEvent.setup();
    renderAt("/collections?tab=community&page=3&sort=created_at");

    await user.click(screen.getByRole("tab", { name: "My collections" }));

    expect(screen.getByTestId("location").textContent).toBe("/collections");
  });

  it("links each tab to the rendered panel for accessibility", () => {
    renderAt("/collections?tab=community");

    const panel = screen.getByRole("tabpanel");
    const tab = screen.getByRole("tab", { name: "Community" });
    expect(tab).toHaveAttribute("aria-controls", panel.id);
    expect(panel).toHaveAttribute("aria-labelledby", tab.id);
  });
});
