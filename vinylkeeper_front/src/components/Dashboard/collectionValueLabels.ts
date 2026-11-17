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

/** Label and reason of the re-evaluate button, from the state of the value */
export function refreshButtonState(value: CollectionValue): { label: string; disabled: boolean; hint: string } {
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
        ? i18n.t("dashboard:refresh.nextOn", { when: formatWhen(value.next_refresh_at) })
        : i18n.t("dashboard:refresh.oncePerDay"),
    };
  }
  if (value.refreshable === 0) {
    return { label: i18n.t("dashboard:refresh.upToDate"), disabled: true, hint: i18n.t("dashboard:refresh.upToDateHint") };
  }
  return {
    label: i18n.t("dashboard:refresh.button"),
    disabled: false,
    hint: i18n.t("dashboard:refresh.hint"),
  };
}
