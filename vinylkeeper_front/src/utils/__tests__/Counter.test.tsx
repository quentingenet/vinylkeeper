import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import Counter from "@utils/Counter";

describe("Counter", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("starts at 0", () => {
    vi.useFakeTimers();
    render(<Counter target={100} duration={1000} />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("reaches the target value once the duration has elapsed", () => {
    vi.useFakeTimers();
    render(<Counter target={100} duration={1000} />);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("does not overshoot the target while animating", () => {
    vi.useFakeTimers();
    render(<Counter target={50} duration={1000} />);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    const displayed = Number(screen.getByText(/\d+/).textContent);
    expect(displayed).toBeGreaterThanOrEqual(0);
    expect(displayed).toBeLessThanOrEqual(50);
  });

  it("renders the target immediately for target=0", () => {
    vi.useFakeTimers();
    render(<Counter target={0} duration={1000} />);

    act(() => {
      vi.advanceTimersByTime(10);
    });

    expect(screen.getByText("0")).toBeInTheDocument();
  });
});
