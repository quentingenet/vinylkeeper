import type { CollectionValue, Currency } from "@models/IDashboardStats";
import i18n, { formatLocale } from "@utils/i18n";

/** 2960.4 EUR -> "€2,960" (whole units, in the locale of the device) */
export function formatMoney(value: number, currency: Currency): string {
  return new Intl.NumberFormat(formatLocale(), { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

/** "2026-10-30T07:55:43Z" -> local date and time, short */
export function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(formatLocale(), { dateStyle: "medium", timeStyle: "short" });
}

const MINUTE_MS = 60 * 1000;
const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;

/**
 * Time left until a date, the two largest units in the language of the app: "6 days 4 hr",
 * "4 h 12 min", "12 min". Rounded up to the minute, so it never reads 0 before the time has come.
 */
export function formatRemaining(untilIso: string, now: number): string {
  const minutes = Math.max(1, Math.ceil((new Date(untilIso).getTime() - now) / MINUTE_MS));
  const parts: [Intl.NumberFormatOptions["unit"], number][] = [
    ["day", Math.floor(minutes / MINUTES_PER_DAY)],
    ["hour", Math.floor((minutes % MINUTES_PER_DAY) / MINUTES_PER_HOUR)],
    ["minute", minutes % MINUTES_PER_HOUR],
  ];
  const first = parts.findIndex(([, amount]) => amount > 0);
  return parts
    .slice(first, first + 2)
    .filter(([, amount]) => amount > 0)
    .map(([unit, amount]) =>
      new Intl.NumberFormat(formatLocale(), { style: "unit", unit, unitDisplay: "short" }).format(amount),
    )
    .join(" ");
}

/** True once the next re-evaluation is allowed (the value is then read again) */
export function refreshAllowedAgain(value: CollectionValue, now: number): boolean {
  return value.refreshes_left === 0 && !!value.next_refresh_at && new Date(value.next_refresh_at).getTime() <= now;
}

/** Label and reason of the re-evaluate button, from the state of the value and the current time */
export function refreshButtonState(
  value: CollectionValue,
  now: number = Date.now(),
): { label: string; disabled: boolean; hint: string } {
  if (value.refresh_pending > 0) {
    return {
      label: i18n.t("dashboard:refresh.pending", { count: value.refresh_pending }),
      disabled: true,
      hint: i18n.t("dashboard:refresh.pendingHint"),
    };
  }
  if (value.refreshes_left === 0) {
    return {
      label: i18n.t("dashboard:refresh.button"),
      disabled: true,
      hint: value.next_refresh_at
        ? i18n.t("dashboard:refresh.nextIn", { remaining: formatRemaining(value.next_refresh_at, now) })
        : i18n.t("dashboard:refresh.oncePer", { count: value.refresh_interval_days }),
    };
  }
  if (value.refreshable === 0) {
    return {
      label: i18n.t("dashboard:refresh.upToDate"),
      disabled: true,
      hint: i18n.t("dashboard:refresh.upToDateHint", { count: value.price_max_age_days }),
    };
  }
  return {
    label: i18n.t("dashboard:refresh.button"),
    disabled: false,
    hint: i18n.t("dashboard:refresh.hint", { count: value.refresh_interval_days }),
  };
}
