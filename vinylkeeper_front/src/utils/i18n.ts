import i18n, { type Resource } from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

/** Languages of the interface; the API accepts the same ones (users.language). */
export const SUPPORTED_LANGUAGES = ["en", "fr", "es", "pt", "de", "it"] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];
/** What a member saved: a language, or null to follow the device */
export type LanguagePreference = AppLanguage | null;

export const FALLBACK_LANGUAGE: AppLanguage = "en";

/** Name of each language in itself, as listed in the language pickers */
export const LANGUAGE_NAMES: Record<AppLanguage, string> = {
  en: "English",
  fr: "Français",
  es: "Español",
  pt: "Português",
  de: "Deutsch",
  it: "Italiano",
};

/** "fr-CA" gives fr, "pt-BR" gives pt; a language the app does not have gives English. */
export function toAppLanguage(tag: string | null | undefined): AppLanguage {
  const prefix = (tag ?? "").slice(0, 2).toLowerCase();
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(prefix) ? (prefix as AppLanguage) : FALLBACK_LANGUAGE;
}

/** Full locale of the device (en-GB, fr-FR...). The Android WebView gives the language of the system. */
export function deviceLocale(): string {
  return typeof navigator !== "undefined" && navigator.language ? navigator.language : FALLBACK_LANGUAGE;
}

export function currentLanguage(): AppLanguage {
  return toAppLanguage(i18n.resolvedLanguage ?? i18n.language);
}

/**
 * Locale of dates, numbers and prices: the full locale of the device when it speaks the language
 * of the interface (en-GB keeps day/month order), else the language of the interface alone.
 */
export function formatLocale(): string {
  const device = deviceLocale();
  const language = currentLanguage();
  return device.toLowerCase().startsWith(language) ? device : language;
}

/** A date in the locale of formatLocale(): "12 Oct 2026" in en-GB, "12 oct. 2026" in fr-FR. */
export function formatDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }
): string {
  return new Intl.DateTimeFormat(formatLocale(), options).format(typeof date === "string" ? new Date(date) : date);
}

/** A number in the locale of formatLocale(): "1,234" in en-GB, "1 234" in fr-FR. */
export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(formatLocale(), options).format(value);
}

// Region codes by their English name: Discogs writes countries in English ("France", "US", "UK")
let regionCodes: Map<string, string> | null = null;
function regionCodeOf(name: string): string | undefined {
  if (!regionCodes) {
    regionCodes = new Map([["US", "US"], ["UK", "GB"], ["USA", "US"]]);
    const english = new Intl.DisplayNames(["en"], { type: "region" });
    for (let first = 65; first <= 90; first++) {
      for (let second = 65; second <= 90; second++) {
        const code = String.fromCharCode(first, second);
        const label = english.of(code);
        if (label && label !== code) regionCodes.set(label, code);
      }
    }
  }
  return regionCodes.get(name);
}

/**
 * The country of a pressing in the language of the interface. In English it stays as Discogs writes
 * it; a value that is not a country ("Europe", "UK & Europe", "Unknown") always stays as it is.
 */
export function localizedCountry(country: string): string {
  const language = currentLanguage();
  if (language === FALLBACK_LANGUAGE) return country;
  const code = regionCodeOf(country);
  return code ? (new Intl.DisplayNames([formatLocale()], { type: "region" }).of(code) ?? country) : country;
}

/** A member's saved language, or the one of the device when there is none (or no member). */
export function applyLanguagePreference(preference: LanguagePreference | undefined): Promise<unknown> {
  return i18n.changeLanguage(preference ?? toAppLanguage(deviceLocale()));
}

// Every src/locales/<language>/<namespace>.json, bundled: no request, the texts are there at startup
const files = import.meta.glob<Record<string, unknown>>("../locales/*/*.json", { eager: true, import: "default" });
const resources: Resource = {};
for (const [path, content] of Object.entries(files)) {
  const [, language, namespace] = /locales\/([^/]+)\/([^/]+)\.json$/.exec(path) ?? [];
  if (!language || !namespace) continue;
  resources[language] = { ...resources[language], [namespace]: content };
}
export const NAMESPACES = Object.keys(resources[FALLBACK_LANGUAGE] ?? {});

const detector = new LanguageDetector();
// The language of the device only: nothing is stored in the browser (no localStorage, no cookie)
detector.addDetector({ name: "device", lookup: () => toAppLanguage(deviceLocale()) });

void i18n
  .use(detector)
  .use(initReactI18next)
  .init({
    resources,
    ns: NAMESPACES,
    defaultNS: "common",
    supportedLngs: [...SUPPORTED_LANGUAGES],
    fallbackLng: FALLBACK_LANGUAGE,
    detection: { order: ["device"], caches: [] },
    // React escapes the values itself
    interpolation: { escapeValue: false },
    returnNull: false,
    // The texts are bundled: ready before the first render
    initAsync: false,
  });

/** Default title of the tab, in each language: a page that leaves puts the current one back. */
export function defaultDocumentTitle(): string {
  return i18n.t("common:meta.title");
}

function isDefaultDocumentTitle(title: string): boolean {
  return SUPPORTED_LANGUAGES.some((language) => i18n.t("common:meta.title", { lng: language }) === title);
}

/** The title a page found when it opened, in the current language if it was the default one. */
export function titleToRestore(previous: string): string {
  return isDefaultDocumentTitle(previous) ? defaultDocumentTitle() : previous;
}

function syncDocument(language: string): void {
  if (typeof document === "undefined") return;
  document.documentElement.lang = toAppLanguage(language);
  if (!document.title || isDefaultDocumentTitle(document.title)) document.title = defaultDocumentTitle();
}

i18n.on("languageChanged", syncDocument);
syncDocument(i18n.language);

export default i18n;
