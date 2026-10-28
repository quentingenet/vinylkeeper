import { describe, it, expect } from "vitest";
import { albumTitleOnly, formatDecade, formatMoodName } from "@components/SpinningNow/spinningNowLabels";
import { buildSpinningNowQuery } from "@services/SpinningNowApiService";

describe("spinning now labels", () => {
  it("formats mood names", () => {
    expect(formatMoodName("laid_back")).toBe("Laid back");
    expect(formatMoodName("calm")).toBe("Calm");
  });

  it("formats decades", () => {
    expect(formatDecade(1970)).toBe("1970s");
  });

  it("keeps the title part of 'Artist - Title'", () => {
    expect(albumTitleOnly("AC/DC - Highway To Hell")).toBe("Highway To Hell");
    expect(albumTitleOnly("Artist - Live - Part 1")).toBe("Live - Part 1");
    expect(albumTitleOnly("No separator")).toBe("No separator");
    expect(albumTitleOnly(null)).toBe("");
  });
});

describe("buildSpinningNowQuery", () => {
  it("repeats keys for list filters, as FastAPI expects", () => {
    const query = buildSpinningNowQuery(
      { moods: ["calm", "laid_back"], eras: [1970], genres: ["Funk / Soul"], collections: [7, 8] },
      12
    );

    expect(query).toBe(
      "moods=calm&moods=laid_back&eras=1970&genres=Funk+%2F+Soul&collections=7&collections=8&limit=12"
    );
  });

  it("sends only the limit without filters", () => {
    expect(buildSpinningNowQuery({ moods: [], eras: [], genres: [], collections: [] }, 1)).toBe("limit=1");
  });
});
