import type { CollectionValue, Currency } from "@models/IDashboardStats";

/** 2960.4 EUR -> "€2,960" (whole units, in the reader's locale) */
export function formatMoney(value: number, currency: Currency): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

/** "2026-10-30T07:55:43Z" -> local date and time, short */
export function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** Label and reason of the re-evaluate button, from the state of the value */
export function refreshButtonState(value: CollectionValue): { label: string; disabled: boolean; hint: string } {
  if (value.refresh_pending > 0) {
    return {
      label: `Re-evaluating, ${value.refresh_pending} left`,
      disabled: true,
      hint: "Discogs prices are asked one by one, the estimate updates as they come.",
    };
  }
  if (value.refreshes_left === 0) {
    return {
      label: "Re-evaluate",
      disabled: true,
      hint: value.next_refresh_at
        ? `One re-evaluation a day. Next one possible on ${formatWhen(value.next_refresh_at)}.`
        : "One re-evaluation a day.",
    };
  }
  if (value.refreshable === 0) {
    return { label: "Up to date", disabled: true, hint: "Every price of your collections is less than a day old." };
  }
  return {
    label: "Re-evaluate",
    disabled: false,
    hint: "Updates every collection you own, once a day. Prices are asked again in the background, you can leave the page.",
  };
}
