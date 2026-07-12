import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "@hooks/useDebounce";

describe("useDebounce", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not call the callback before the delay has elapsed", () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    renderHook(() => useDebounce(callback, 500, []));

    act(() => {
      vi.advanceTimersByTime(499);
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it("calls the callback once the delay has elapsed", () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    renderHook(() => useDebounce(callback, 500, []));

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("resets the timer when a dependency changes before the delay elapses (debounce behavior)", () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const { rerender } = renderHook(
      ({ dep }) => useDebounce(callback, 500, [dep]),
      { initialProps: { dep: "a" } }
    );

    act(() => {
      vi.advanceTimersByTime(300);
    });
    rerender({ dep: "b" }); // simulates the user typing again mid-debounce

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(callback).not.toHaveBeenCalled(); // only 300ms since the reset

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(callback).toHaveBeenCalledTimes(1); // full 500ms since the last change
  });

  it("always uses the latest callback, even if it was replaced after scheduling", () => {
    vi.useFakeTimers();
    const firstCallback = vi.fn();
    const secondCallback = vi.fn();
    const { rerender } = renderHook(
      ({ cb }) => useDebounce(cb, 500, []),
      { initialProps: { cb: firstCallback } }
    );

    rerender({ cb: secondCallback });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(firstCallback).not.toHaveBeenCalled();
    expect(secondCallback).toHaveBeenCalledTimes(1);
  });

  it("clears the pending timeout on unmount", () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const { unmount } = renderHook(() => useDebounce(callback, 500, []));

    unmount();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(callback).not.toHaveBeenCalled();
  });
});
