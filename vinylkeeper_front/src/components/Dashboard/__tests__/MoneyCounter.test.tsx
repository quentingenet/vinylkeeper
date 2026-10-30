import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import MoneyCounter from "@components/Dashboard/MoneyCounter";
import { formatMoney as format } from "@components/Dashboard/collectionValueLabels";
import type { Currency } from "@models/IDashboardStats";

// As Testing Library reads the text: the narrow no-break spaces of some locales become spaces
const formatMoney = (amount: number, currency: Currency) => format(amount, currency).replace(/\s+/g, " ");

const rollingNode = (container: HTMLElement) => container.querySelector('[aria-hidden="true"]');
const rolling = (container: HTMLElement) => rollingNode(container)?.textContent?.replace(/\s+/g, " ");

// Simulated clock and animation frames: the roll takes no real time, so the suite never waits on it
const elapse = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance", "setTimeout"] });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("MoneyCounter", () => {
  it("gives screen readers the final amount at once", () => {
    render(<MoneyCounter amount={2960} currency="EUR" />);

    expect(screen.getByText(formatMoney(2960, "EUR"))).toBeInTheDocument();
  });

  it("rolls from zero up to the amount", () => {
    const { container } = render(<MoneyCounter amount={2960} currency="EUR" />);
    expect(rolling(container)).not.toBe(formatMoney(2960, "EUR"));

    elapse(700);
    const halfway = Number(rolling(container)?.replace(/\D/g, ""));
    expect(halfway).toBeGreaterThan(0);
    expect(halfway).toBeLessThan(2960);

    elapse(1000);
    expect(rolling(container)).toBe(formatMoney(2960, "EUR"));
  });

  it("rolls from the previous amount when it changes", () => {
    const { container, rerender } = render(<MoneyCounter amount={100} currency="EUR" />);
    elapse(2000);

    rerender(<MoneyCounter amount={180} currency="EUR" />);
    elapse(100);

    expect(Number(rolling(container)?.replace(/\D/g, ""))).toBeGreaterThanOrEqual(100);
    elapse(2000);
    expect(rolling(container)).toBe(formatMoney(180, "EUR"));
  });

  it("ends every roll on a pulse, whichever way the amount goes", () => {
    const { container, rerender } = render(<MoneyCounter amount={2048} currency="USD" />);
    const arriving = rollingNode(container);
    // The pulse restarts its animation by mounting the figures again
    elapse(2000);
    const landed = rollingNode(container);
    expect(landed).not.toBe(arriving);

    rerender(<MoneyCounter amount={1840} currency="EUR" />);
    elapse(2000);

    expect(rolling(container)).toBe(formatMoney(1840, "EUR"));
    expect(rollingNode(container)).not.toBe(landed);
  });

  it("waits until the amount is on screen to roll", () => {
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
    elapse(2000);
    expect(rolling(container)).toBe(formatMoney(0, "EUR"));
    expect(screen.getByText(formatMoney(2960, "EUR"))).toBeInTheDocument(); // screen readers

    act(() => reportVisibility(true));
    elapse(2000);
    expect(rolling(container)).toBe(formatMoney(2960, "EUR"));
  });

  it("shows the amount at once when the system asks for less motion", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduce"), media: query }));
    const { container } = render(<MoneyCounter amount={2960} currency="EUR" />);

    expect(rolling(container)).toBe(formatMoney(2960, "EUR"));
  });
});
