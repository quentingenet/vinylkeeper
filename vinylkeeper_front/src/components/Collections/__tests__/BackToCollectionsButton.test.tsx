import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import BackToCollectionsButton from "@components/Collections/BackToCollectionsButton";

afterEach(cleanup);

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

type Entry = string | { pathname: string; state: unknown };

const renderAt = (entries: Entry[], isOwner: boolean) =>
  render(
    <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
      <Routes>
        <Route path="/collections/:id" element={<BackToCollectionsButton isOwner={isOwner} />} />
        <Route path="*" element={<div>list</div>} />
      </Routes>
      <LocationDisplay />
    </MemoryRouter>
  );

describe("BackToCollectionsButton", () => {
  it("leads an owner opening a direct link to My collections", () => {
    renderAt(["/collections/23"], true);

    const link = screen.getByRole("link", { name: "Back to My collections" });
    expect(link).toHaveAttribute("href", "/collections");
  });

  it("leads a visitor opening a direct link to Community", () => {
    renderAt(["/collections/23"], false);

    const link = screen.getByRole("link", { name: "Back to Community" });
    expect(link).toHaveAttribute("href", "/collections?tab=community");
  });

  it("goes back to the same tab, page and sort of the list it was opened from", async () => {
    const user = userEvent.setup();
    const list = "/collections?tab=community&page=3&sort=created_at";
    renderAt([list, { pathname: "/collections/23", state: { backTo: list } }], false);

    await user.click(screen.getByRole("link", { name: "Back to Community" }));

    expect(screen.getByTestId("location")).toHaveTextContent(list);
  });

  it("ignores a backTo that is not a collections list", () => {
    renderAt([{ pathname: "/collections/23", state: { backTo: "/dashboard" } }], true);

    expect(screen.getByRole("link", { name: "Back to My collections" })).toHaveAttribute(
      "href",
      "/collections"
    );
  });
});
