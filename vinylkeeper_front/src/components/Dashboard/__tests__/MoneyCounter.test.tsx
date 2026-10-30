import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, act } from "@testing-library/react";
import MoneyCounter from "@components/Dashboard/MoneyCounter";
import { formatMoney as format } from "@components/Dashboard/collectionValueLabels";
import type { Currency } from "@models/IDashboardStats";

// As Testing Library reads the text: the narrow no-break spaces of some locales become spaces
const formatMoney = (amount: number, currency: Currency) => format(amount, currency).replace(/\s+/g, " ");

const rolling = (container: HTMLElement) => container.querySelector('[aria-hidden="true"]')?.textContent?.replace(/\s+/g, " ");

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("MoneyCounter", () => {
  it("gives screen readers the final amount at once", () => {
    render(<MoneyCounter amount={2960} currency="EUR" />);

    expect(screen.getByText(formatMoney(2960, "EUR"))).toBeInTheDocument();
  });

  it("rolls from zero up to the amount", async () => {
    const { container } = render(<MoneyCounter amount={2960} currency="EUR" />);

    expect(rolling(container)).not.toBe(formatMoney(2960, "EUR"));
    await waitFor(() => expect(rolling(container)).toBe(formatMoney(2960, "EUR")), { timeout: 3000 });
  });

  it("rolls from the previous amount when it changes", async () => {
    const { container, rerender } = render(<MoneyCounter amount={100} currency="EUR" />);
    await waitFor(() => expect(rolling(container)).toBe(formatMoney(100, "EUR")), { timeout: 3000 });

    rerender(<MoneyCounter amount={180} currency="EUR" />);

    await waitFor(() => {
      const shown = Number(rolling(container)?.replace(/\D/g, ""));
      expect(shown).toBeGreaterThanOrEqual(100);
    });
    await waitFor(() => expect(rolling(container)).toBe(formatMoney(180, "EUR")), { timeout: 3000 });
  });

  it("ends every roll on a pulse, whichever way the amount goes", async () => {
    const { container, rerender } = render(<MoneyCounter amount={2048} currency="USD" />);
    const rollingNode = () => container.querySelector('[aria-hidden="true"]');
    const arriving = rollingNode();
    // The pulse restarts its animation by mounting the figures again
    await waitFor(() => expect(rollingNode()).not.toBe(arriving), { timeout: 3000 });

    const landed = rollingNode();
    rerender(<MoneyCounter amount={1840} currency="EUR" />);

    await waitFor(() => expect(rolling(container)).toBe(formatMoney(1840, "EUR")), { timeout: 3000 });
    await waitFor(() => expect(rollingNode()).not.toBe(landed));
  });

  it("waits until the amount is on screen to roll", async () => {
    let reportVisibility: (visible: boolean) => void = () => {};
    vi.stubGlobal("IntersectionObserver", class {
      constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
        reportVisibility = (visible) => callback([{ isIntersecting: visible }]);
      }
      observe() {}
      disconnect() {}
    });
    const { container } = render(<MoneyCounter amount={2960} currency="EUR" />);

    act(() => reportVisibility(false));
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(rolling(container)).toBe(formatMoney(0, "EUR"));
    expect(screen.getByText(formatMoney(2960, "EUR"))).toBeInTheDocument();  // screen readers

    act(() => reportVisibility(true));
    await waitFor(() => expect(rolling(container)).toBe(formatMoney(2960, "EUR")), { timeout: 3000 });
  });

  it("shows the amount at once when the system asks for less motion", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduce"), media: query }));
    const { container } = render(<MoneyCounter amount={2960} currency="EUR" />);

    expect(rolling(container)).toBe(formatMoney(2960, "EUR"));
  });
});
