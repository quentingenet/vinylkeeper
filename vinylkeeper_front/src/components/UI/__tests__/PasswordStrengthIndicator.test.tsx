import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import PasswordStrengthIndicator from "../PasswordStrengthIndicator";

afterEach(cleanup);

describe("PasswordStrengthIndicator", () => {
  it("tells the rules before the first key, without a strength bar", () => {
    render(<PasswordStrengthIndicator password="" />);

    expect(screen.getByText(/At least 8 characters/)).toBeInTheDocument();
    expect(screen.getByText(/Contains a letter/)).toBeInTheDocument();
    expect(screen.getByText(/Contains a number/)).toBeInTheDocument();
    expect(screen.queryByText(/welcome/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Password strength")).not.toBeInTheDocument();
  });

  it("ticks the rules as they are met, 7 characters not being enough", () => {
    render(<PasswordStrengthIndicator password="abcdef1" />);

    expect(screen.getByText(/○ At least 8 characters/)).toBeInTheDocument();
    expect(screen.getByText(/✓ Contains a letter/)).toBeInTheDocument();
    expect(screen.getByText(/✓ Contains a number/)).toBeInTheDocument();
  });

  it("accepts symbols, spaces and accents: they never fail a rule", () => {
    render(<PasswordStrengthIndicator password="Été 2026 !?" />);

    expect(screen.getByText(/✓ At least 8 characters/)).toBeInTheDocument();
    expect(screen.getByText(/✓ Contains a letter/)).toBeInTheDocument();
    expect(screen.getByText("Strong")).toBeInTheDocument();
  });

  it("writes in black on a light background, and keeps the colors of the theme on a dark one", () => {
    const { rerender } = render(<PasswordStrengthIndicator password="abc" onLight />);
    expect(screen.getByText(/○ At least 8 characters/)).toHaveStyle({ color: "rgb(0, 0, 0)" });
    expect(screen.getByText(/✓ Contains a letter/)).toHaveStyle({ color: "rgb(0, 0, 0)", fontWeight: "700" });

    rerender(<PasswordStrengthIndicator password="abc" />);
    expect(screen.getByText(/○ At least 8 characters/)).not.toHaveStyle({ color: "rgb(0, 0, 0)" });
  });

  it("is complete at 8 characters with a letter and a number", () => {
    render(<PasswordStrengthIndicator password="abcdefg1" />);
    expect(screen.getByText("Strong")).toBeInTheDocument();
  });
});
