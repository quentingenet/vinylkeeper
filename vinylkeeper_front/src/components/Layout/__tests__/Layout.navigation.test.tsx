import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    <MemoryRouter initialEntries={[url]}>
      <Layout>
        <div />
      </Layout>
    </MemoryRouter>
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

      await user.click(within(header).getByRole("button"));
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

    await user.click(within(header).getByRole("button"));
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
