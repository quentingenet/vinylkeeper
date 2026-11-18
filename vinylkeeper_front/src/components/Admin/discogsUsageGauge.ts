import type { DiscogsUsageTotals } from "@services/AdminApiService";

// Share of the Discogs allowance past which the gauge turns orange, then red
const WARNING_SHARE = 0.5;
const DANGER_SHARE = 0.8;

export function usageShare({ calls, capacity }: DiscogsUsageTotals): number {
  return capacity > 0 ? Math.min(calls / capacity, 1) : 0;
}

export function gaugeColor(share: number): "success" | "warning" | "error" {
  if (share >= DANGER_SHARE) return "error";
  if (share >= WARNING_SHARE) return "warning";
  return "success";
}
