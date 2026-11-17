import "@testing-library/jest-dom/vitest";
import i18n from "@utils/i18n";

// Tests read the English texts, whatever the language of the machine running them
void i18n.changeLanguage("en");

// Dates and numbers follow the locale of the device: British English in tests ("12 Oct 2026")
// (a test file run in the node environment has no window)
if (typeof window !== "undefined") {
  Object.defineProperty(window.navigator, "language", { value: "en-GB", configurable: true });
}
