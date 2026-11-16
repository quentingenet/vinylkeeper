import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AppVersion from "../AppVersion";

describe("AppVersion", () => {
  it("shows the version of the app set at build time, after a v", () => {
    render(<AppVersion />);
    expect(__APP_VERSION__).toMatch(/^\d+(\.\d+)+$/);
    expect(screen.getByText(`v${__APP_VERSION__}`)).toBeInTheDocument();
  });
});
