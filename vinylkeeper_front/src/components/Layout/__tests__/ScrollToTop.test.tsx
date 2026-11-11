import { describe, it, expect, vi, beforeEach } from "vitest";
import { useEffect } from "react";
import { render, act } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import ScrollToTop from "@components/Layout/ScrollToTop";

const router = { go: (_to: string): void => undefined };
function Navigator() {
  const navigate = useNavigate();
  useEffect(() => {
    router.go = (to) => void navigate(to);
  }, [navigate]);
  return null;
}

describe("ScrollToTop", () => {
  const scrollTo = vi.fn();
  beforeEach(() => {
    scrollTo.mockReset();
    window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
  });

  it("goes to the top when the page changes", () => {
    render(
      <MemoryRouter initialEntries={["/collections"]}>
        <ScrollToTop />
        <Navigator />
      </MemoryRouter>
    );
    scrollTo.mockClear();

    act(() => router.go("/collections/12"));

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "instant" });
  });

  it("stays put when only the query string changes", () => {
    render(
      <MemoryRouter initialEntries={["/collections/12?page=1"]}>
        <ScrollToTop />
        <Navigator />
      </MemoryRouter>
    );
    scrollTo.mockClear();

    act(() => router.go("/collections/12?page=2"));

    expect(scrollTo).not.toHaveBeenCalled();
  });
});
