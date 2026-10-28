// Found on almost every release: tells nothing about the edition
const NOISE_FORMATS = new Set(["Album"]);

// Pressing details of a Discogs release, in search results and album metadata alike
export interface Edition {
  year?: string | null;
  country?: string | null;
  label?: string | null;
  catno?: string | null;
  formats?: string[];
}

export interface EditionChip {
  key: string;
  label: string;
}

export function editionChips(edition: Edition): EditionChip[] {
  const labelAndCatno = [edition.label, edition.catno].filter(Boolean).join(" ");
  const formats = (edition.formats ?? []).filter((f) => !NOISE_FORMATS.has(f)).join(", ");
  // Discogs writes 0 when the year is unknown
  const year = edition.year && edition.year !== "0" ? edition.year : "";
  return [
    { key: "year", label: year },
    { key: "country", label: edition.country ?? "" },
    { key: "label", label: labelAndCatno },
    { key: "formats", label: formats },
  ].filter((chip) => chip.label);
}

export const hasEdition = (edition: Edition) => editionChips(edition).length > 0;
