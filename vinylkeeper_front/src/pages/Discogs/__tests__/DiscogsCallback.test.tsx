import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DiscogsCallback from "../DiscogsCallback";

describe("DiscogsCallback", () => {
  it("offers to open the app, with a link the system can hand over to it", () => {
    render(
      <MemoryRouter>
        <DiscogsCallback />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: "Open the Vinyl Keeper app" })).toHaveAttribute("href", window.location.href);
    expect(screen.getByRole("link", { name: "Go to my collections" })).toHaveAttribute("href", "/collections");
  });
});
