import { describe, it, expect } from "vitest";
import {
  formatMoney,
  formatRemaining,
  refreshAllowedAgain,
  refreshButtonState,
} from "@components/Dashboard/collectionValueLabels";
import type { CollectionValue } from "@models/IDashboardStats";

const value = {
  refresh_pending: 0, refreshes_left: 2, refreshable: 3, next_refresh_at: null,
  refresh_interval_days: 7, price_max_age_days: 7,
} as CollectionValue;

const NOW = Date.parse("2026-11-18T10:00:00Z");
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const at = (ms: number) => new Date(NOW + ms).toISOString();

describe("formatMoney", () => {
  it("shows whole units with the currency", () => {
    expect(formatMoney(2960.4, "EUR")).toMatch(/2.?960/);
    expect(formatMoney(2960.4, "EUR")).toContain("€");
    expect(formatMoney(12, "USD")).toContain("$");
  });
});

describe("refreshButtonState", () => {
  it("offers the daily re-evaluation", () => {
    expect(refreshButtonState({ ...value, refreshes_left: 1 })).toMatchObject({ label: "Re-evaluate", disabled: false });
  });

  it("waits while prices are asked, when none is left, or when nothing is stale", () => {
    expect(refreshButtonState({ ...value, refresh_pending: 4 })).toMatchObject({ label: "Re-evaluating, 4 left", disabled: true });
    expect(refreshButtonState({ ...value, refreshes_left: 0 })).toMatchObject({
      disabled: true, hint: "One re-evaluation every 7 days.",
    });
    expect(refreshButtonState({ ...value, refreshable: 0 })).toMatchObject({ label: "Up to date", disabled: true });
  });
});

describe("re-evaluation countdown", () => {
  it("shows the two largest units, rounded up to the minute", () => {
    expect(formatRemaining(at(6 * DAY + 4 * HOUR + 12 * MINUTE), NOW)).toMatch(/^6 days 4 hrs?$/);
    expect(formatRemaining(at(4 * HOUR + 12 * MINUTE), NOW)).toMatch(/^4 hrs? 12 mins?$/);
    expect(formatRemaining(at(2 * DAY), NOW)).toMatch(/^2 days$/);
    expect(formatRemaining(at(30 * 1000), NOW)).toMatch(/^1 min$/);
    // Already past: never zero, the value is read again meanwhile
    expect(formatRemaining(at(-MINUTE), NOW)).toMatch(/^1 min$/);
  });

  it("tells when the next re-evaluation is possible, and when it is again", () => {
    const waiting = { ...value, refreshes_left: 0, next_refresh_at: at(3 * DAY + 2 * HOUR) };
    const state = refreshButtonState(waiting, NOW);
    expect(state.disabled).toBe(true);
    expect(state.hint).toMatch(/^You can re-evaluate again in 3 days 2 hrs?\.$/);
    expect(refreshAllowedAgain(waiting, NOW)).toBe(false);
    expect(refreshAllowedAgain(waiting, NOW + 3 * DAY + 2 * HOUR)).toBe(true);
    expect(refreshAllowedAgain({ ...value, refreshes_left: 1 }, NOW + 9 * DAY)).toBe(false);
  });

  it("follows the durations set on the server", () => {
    expect(refreshButtonState({ ...value, refreshable: 0, price_max_age_days: 30 }).hint)
      .toBe("Every price of your collections is less than 30 days old.");
    expect(refreshButtonState({ ...value, refresh_interval_days: 1 }).hint).toMatch(/^Updates every collection you own, once a day\./);
  });
});
