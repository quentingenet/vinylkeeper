import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useLastPageWhenEmpty } from "@hooks/useLastPageWhenEmpty";

describe("useLastPageWhenEmpty", () => {
  it("goes back to the last page that exists when the current page is empty", () => {
    const setPage = vi.fn();

    // 3 pages of 8 became 2 pages: the third one, now empty, no longer exists
    renderHook(() => useLastPageWhenEmpty(3, setPage, 0, 2));

    expect(setPage).toHaveBeenCalledWith(2);
  });

  it("goes back one page when the server reports no page count", () => {
    const setPage = vi.fn();

    renderHook(() => useLastPageWhenEmpty(3, setPage, 0, undefined));

    expect(setPage).toHaveBeenCalledWith(1);
  });

  it("never goes below the first page, and leaves an empty first page alone", () => {
    const setPage = vi.fn();

    renderHook(() => useLastPageWhenEmpty(1, setPage, 0, 0));

    expect(setPage).not.toHaveBeenCalled();
  });

  it("does nothing while the list is loading or off screen (no count)", () => {
    const setPage = vi.fn();

    renderHook(() => useLastPageWhenEmpty(3, setPage, undefined, 3));

    expect(setPage).not.toHaveBeenCalled();
  });

  it("does nothing while the page has items", () => {
    const setPage = vi.fn();

    renderHook(() => useLastPageWhenEmpty(3, setPage, 5, 3));

    expect(setPage).not.toHaveBeenCalled();
  });

  it("steps back page by page until it finds items", () => {
    const setPage = vi.fn();
    const { rerender } = renderHook(
      ({ page, count }) => useLastPageWhenEmpty(page, setPage, count, 3),
      { initialProps: { page: 3, count: 0 } }
    );
    expect(setPage).toHaveBeenLastCalledWith(2);

    rerender({ page: 2, count: 0 });
    expect(setPage).toHaveBeenLastCalledWith(1);

    rerender({ page: 1, count: 8 });
    expect(setPage).toHaveBeenCalledTimes(2);
  });
});
