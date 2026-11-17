import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import Layout from "@components/Layout/Layout";

const mobileState = { isMobile: false };

vi.mock("@hooks/useDetectMobile", () => ({
  default: () => mobileState,
}));
vi.mock("@contexts/UserContext", () => ({
  useUserContext: () => ({
    logout: vi.fn(),
    currentUser: { is_admin: false },
  }),
}));

afterEach(cleanup);

const renderLayoutAt = (url: string) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
    <MemoryRouter initialEntries={[url]}>
      <Layout>
        <div />
      </Layout>
    </MemoryRouter>
    </QueryClientProvider>
  );

const getMenuButton = (container: HTMLElement, label: string) => {
  const button = within(container)
    .getByText(label)
    .closest(".MuiListItemButton-root");
  expect(button).not.toBeNull();
  return button as HTMLElement;
};

describe("Layout navigation after merging Explore into Collections", () => {
  describe("desktop", () => {
    beforeEach(() => {
      mobileState.isMobile = false;
    });

    it.each(["/collections", "/collections?tab=community"])(
      "highlights Collections on %s",
      (url) => {
        const { container } = renderLayoutAt(url);

        expect(getMenuButton(container, "Collections")).toHaveClass(
          "Mui-selected"
        );
      }
    );

    it("no longer shows an Explore menu entry", () => {
      renderLayoutAt("/collections");

      expect(screen.queryByText("Explore")).not.toBeInTheDocument();
    });
  });

  describe("mobile", () => {
    beforeEach(() => {
      mobileState.isMobile = true;
    });

    it("shows 'Collections' in the header and highlights it on the Community tab", async () => {
      const user = userEvent.setup();
      renderLayoutAt("/collections?tab=community");

      const header = screen.getByRole("banner");
      expect(within(header).getByText("Collections")).toBeInTheDocument();

      await user.click(within(header).getByRole("button", { name: "Open the menu" }));
      const drawer = screen.getByRole("presentation");
      expect(getMenuButton(drawer, "Collections")).toHaveClass("Mui-selected");
      expect(within(drawer).queryByText("Explore")).not.toBeInTheDocument();
    });
  });
});

describe("Layout navigation for Spinning now", () => {
  it("highlights Spinning now on its page (desktop)", () => {
    mobileState.isMobile = false;
    const { container } = renderLayoutAt("/spinning-now");

    expect(getMenuButton(container, "Spinning now")).toHaveClass("Mui-selected");
    expect(getMenuButton(container, "Collections")).not.toHaveClass("Mui-selected");
  });

  it("shows 'Spinning now' in the mobile header and drawer", async () => {
    mobileState.isMobile = true;
    const user = userEvent.setup();
    renderLayoutAt("/spinning-now");

    const header = screen.getByRole("banner");
    expect(within(header).getByText("Spinning now")).toBeInTheDocument();

    await user.click(within(header).getByRole("button", { name: "Open the menu" }));
    const drawer = screen.getByRole("presentation");
    expect(getMenuButton(drawer, "Spinning now")).toHaveClass("Mui-selected");
  });
});

describe("Layout footer", () => {
  it("credits Discogs on every page, with a followed link to discogs.com", () => {
    mobileState.isMobile = false;
    renderLayoutAt("/collections");

    const footer = screen.getByRole("contentinfo");
    expect(within(footer).getByText(/Data provided by/)).toBeInTheDocument();
    const link = within(footer).getByRole("link", { name: "Discogs" });
    expect(link).toHaveAttribute("href", "https://www.discogs.com");
    expect(link.getAttribute("rel")).not.toContain("nofollow");
  });
});

describe("Layout menu labels too long for the menu", () => {
  beforeEach(() => {
    mobileState.isMobile = false;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("gives the whole label in a tooltip only when it is cut", async () => {
    const user = userEvent.setup();
    // jsdom lays nothing out: the label of Settings is made wider than its room
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockImplementation(function (this: HTMLElement) {
      return this.textContent === "Settings" ? 300 : 100;
    });
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(100);
    // Neither hovered entry is the title of the page, which shows the same words once its animation is over
    const { container } = renderLayoutAt("/collections");

    await user.hover(getMenuButton(container, "Settings"));
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Settings");

    await user.unhover(getMenuButton(container, "Settings"));
    await user.hover(getMenuButton(container, "Atlas"));
    await vi.waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument());
  });
});
