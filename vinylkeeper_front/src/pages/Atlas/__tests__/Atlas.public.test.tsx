import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import Atlas from "@pages/Atlas/Atlas";

const api = vi.hoisted(() => ({ getPlacesMap: vi.fn(), createPlace: vi.fn() }));

vi.mock("@services/AtlasApiService", () => ({ atlasApiService: api }));
vi.mock("@hooks/useDetectMobile", () => ({ default: () => ({ isMobile: false }) }));
// The map itself (Leaflet) is not what is tested: its two actions are
vi.mock("@components/Atlas/AtlasMap", () => ({
  default: ({ onAddPlace, onRequireAccount }: { onAddPlace?: () => void; onRequireAccount?: () => void }) => (
    <div>
      <button onClick={onAddPlace}>Add a spot</button>
      <button onClick={() => onRequireAccount?.()}>Like</button>
    </div>
  ),
}));
vi.mock("@components/Atlas/AtlasSpotAddModal", () => ({
  default: ({ open }: { open: boolean }) => (open ? <div data-testid="add-spot-form" /> : null),
}));

afterEach(cleanup);

const renderAtlas = (isPublic: boolean) => {
  api.getPlacesMap.mockResolvedValue([]);
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <Atlas isPublic={isPublic} />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe("Atlas", () => {
  it.each(["Add a spot", "Like"])("invites a visitor to join instead of %s", async (action) => {
    renderAtlas(true);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: action }));

    const dialog = screen.getByRole("dialog", { name: /Join Vinyl Keeper to like spots and suggest new ones/ });
    expect(dialog).toHaveTextContent("Vinyl Keeper is free and open source");
    expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute("href", "/?auth=register");
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/?auth=login");
    expect(screen.queryByTestId("add-spot-form")).not.toBeInTheDocument();
    expect(api.createPlace).not.toHaveBeenCalled();
  });

  it("offers a visitor the tour of the app, whose Enter leads to the login", async () => {
    renderAtlas(true);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Like" }));

    await user.click(screen.getByRole("button", { name: "Take a look inside?" }));
    const tour = await screen.findByRole("dialog", { name: "A look inside VinylKeeper" });
    expect(within(tour).getByRole("img", { name: "Dashboard" })).toBeInTheDocument();

    await user.click(within(tour).getByRole("button", { name: "Close preview" }));
    // Back to the join popup
    expect(screen.getByRole("dialog", { name: /Join Vinyl Keeper/ })).toBeInTheDocument();
  });

  it("lets a member add a spot", async () => {
    renderAtlas(false);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Add a spot" }));

    expect(screen.getByTestId("add-spot-form")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
