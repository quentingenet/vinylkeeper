import { describe, it, expect, afterEach } from "vitest";
import i18n, {
  SUPPORTED_LANGUAGES,
  applyLanguagePreference,
  defaultDocumentTitle,
  formatLocale,
  localizedCountry,
  titleToRestore,
  toAppLanguage,
} from "@utils/i18n";

type Tree = { [key: string]: string | string[] | Tree };

const files = import.meta.glob<Tree>("../../locales/*/*.json", { eager: true, import: "default" });
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

const locales: Record<string, Record<string, Tree>> = {};
for (const [path, content] of Object.entries(files)) {
  const [, language, namespace] = /locales\/([^/]+)\/([^/]+)\.json$/.exec(path) ?? [];
  locales[language] = { ...locales[language], [namespace]: content };
}

function flatKeys(tree: Tree, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === "object" && !Array.isArray(value) ? flatKeys(value, `${prefix}${key}.`) : [`${prefix}${key}`]
  );
}

/** Keys without their plural forms: each language has the forms its own plural rules need */
const baseKeys = (tree: Tree) => [...new Set(flatKeys(tree).map((key) => key.replace(PLURAL_SUFFIX, "")))].sort();

afterEach(async () => {
  await i18n.changeLanguage("en");
});

describe("translation files", () => {
  it("exist for every language of the app, and only for them", () => {
    expect(Object.keys(locales).sort()).toEqual([...SUPPORTED_LANGUAGES].sort());
  });

  it.each(SUPPORTED_LANGUAGES.filter((language) => language !== "en"))("%s has exactly the keys of en", (language) => {
    expect(Object.keys(locales[language]).sort()).toEqual(Object.keys(locales.en).sort());
    for (const namespace of Object.keys(locales.en)) {
      expect({ namespace, keys: baseKeys(locales[language][namespace]) }).toEqual({
        namespace,
        keys: baseKeys(locales.en[namespace]),
      });
    }
  });

  it.each(SUPPORTED_LANGUAGES)("%s has every plural form its language uses", (language) => {
    const categories = new Intl.PluralRules(language).resolvedOptions().pluralCategories;
    for (const [namespace, tree] of Object.entries(locales[language])) {
      const keys = flatKeys(tree);
      const plurals = new Set(keys.filter((key) => PLURAL_SUFFIX.test(key)).map((key) => key.replace(PLURAL_SUFFIX, "")));
      for (const plural of plurals) {
        for (const category of categories) {
          expect(keys, `${language}/${namespace}: ${plural}_${category}`).toContain(`${plural}_${category}`);
        }
      }
    }
  });
});

describe("language of the device", () => {
  it.each([
    ["fr-FR", "fr"],
    ["fr-CA", "fr"],
    ["es-MX", "es"],
    ["pt-BR", "pt"],
    ["en-GB", "en"],
    ["de-AT", "de"],
    ["it-IT", "it"],
    ["nl-NL", "en"],
    ["", "en"],
    [null, "en"],
  ])("%s gives %s", (tag, language) => {
    expect(toAppLanguage(tag)).toBe(language);
  });
});

describe("applyLanguagePreference", () => {
  it("shows the saved language, and tells the page which one it is", async () => {
    await applyLanguagePreference("fr");

    expect(i18n.language).toBe("fr");
    expect(document.documentElement.lang).toBe("fr");
    expect(i18n.t("nav:items.settings")).toBe("Paramètres");
  });

  it("follows the device when nothing is saved", async () => {
    await applyLanguagePreference("es");
    await applyLanguagePreference(null);

    // The tests run on an en-GB device (setupTests)
    expect(i18n.language).toBe("en");
    expect(document.documentElement.lang).toBe("en");
  });

  it("translates the default title of the tab, and keeps the title of a page", async () => {
    document.title = defaultDocumentTitle();
    await applyLanguagePreference("pt");
    expect(document.title).toBe(i18n.t("common:meta.title", { lng: "pt" }));

    document.title = "Jazz shelf - VinylKeeper";
    await applyLanguagePreference("fr");
    expect(document.title).toBe("Jazz shelf - VinylKeeper");
    // A page left after a change of language puts the default title back in the new language
    expect(titleToRestore(i18n.t("common:meta.title", { lng: "en" }))).toBe(defaultDocumentTitle());
  });
});

describe("formats", () => {
  it("uses the full locale of the device when it speaks the language of the app", async () => {
    expect(formatLocale()).toBe("en-GB");
    await applyLanguagePreference("fr");
    expect(formatLocale()).toBe("fr");
  });

  it("names a Discogs country in the language of the app, and leaves English and non-countries alone", async () => {
    expect(localizedCountry("US")).toBe("US");
    await applyLanguagePreference("fr");
    expect(localizedCountry("Germany")).toBe("Allemagne");
    expect(localizedCountry("UK")).toBe("Royaume-Uni");
    expect(localizedCountry("Europe")).toBe("Europe");
    expect(localizedCountry("UK & Europe")).toBe("UK & Europe");
  });

  it("uses the plural forms of each language", async () => {
    await applyLanguagePreference("fr");
    expect(i18n.t("collections:counts.records", { count: 0 })).toBe("0 disque");
    expect(i18n.t("collections:counts.records", { count: 2 })).toBe("2 disques");
  });
});
