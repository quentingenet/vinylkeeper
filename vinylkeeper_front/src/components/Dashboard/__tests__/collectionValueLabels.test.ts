import { describe, it, expect } from "vitest";
import { formatMoney, refreshButtonState } from "@components/Dashboard/collectionValueLabels";
import type { CollectionValue } from "@models/IDashboardStats";

const value = {
  refresh_pending: 0, refreshes_left: 2, refreshable: 3, next_refresh_at: null,
} as CollectionValue;

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
    expect(refreshButtonState({ ...value, refreshes_left: 0 })).toMatchObject({ disabled: true, hint: "One re-evaluation a day." });
    expect(refreshButtonState({ ...value, refreshable: 0 })).toMatchObject({ label: "Up to date", disabled: true });
  });
});
