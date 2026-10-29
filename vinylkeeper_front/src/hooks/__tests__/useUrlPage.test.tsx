import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useUrlPage } from "@hooks/useUrlPage";

const renderAt = (url: string) =>
  renderHook(
    () => ({ page: useUrlPage("page"), location: useLocation() }),
    {
      wrapper: ({ children }: { children: ReactNode }) => (
        <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
      ),
    }
  );

describe("useUrlPage", () => {
  it("reads the page of the URL", () => {
    const { result } = renderAt("/collections?page=4");
    expect(result.current.page[0]).toBe(4);
  });

  it.each(["/collections", "/collections?page=0", "/collections?page=-2", "/collections?page=abc", "/collections?page=1.5"])(
    "falls back to page 1 for %s",
    (url) => {
      const { result } = renderAt(url);
      expect(result.current.page[0]).toBe(1);
    }
  );

  it("writes the page and keeps the other parameters", () => {
    const { result } = renderAt("/collections?tab=community");

    act(() => result.current.page[1](3));

    expect(result.current.location.search).toBe("?tab=community&page=3");
  });

  it("leaves page 1 out of the URL", () => {
    const { result } = renderAt("/collections?tab=community&page=3");

    act(() => result.current.page[1](1));

    expect(result.current.location.search).toBe("?tab=community");
  });
});
