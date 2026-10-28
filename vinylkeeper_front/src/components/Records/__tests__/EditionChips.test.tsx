import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import EditionChips from "@components/Records/EditionChips";
import { editionChips } from "@components/Records/editionLabels";
import type { IAlbumRequestResults } from "@models/IRequestProxy";

afterEach(cleanup);

const original: IAlbumRequestResults = {
  uuid: "u1",
  id: "2252871",
  title: "Miles Davis - Kind Of Blue",
  year: "1959",
  country: "US",
  label: "Columbia",
  catno: "CL 1355",
  formats: ["LP", "Album", "Mono"],
  master_id: "5460",
};

describe("editionChips", () => {
  it("lists year, country, label with catalogue number, then formats without noise", () => {
    expect(editionChips(original).map((c) => c.label)).toEqual(["1959", "US", "Columbia CL 1355", "LP, Mono"]);
  });

  it("ignores the 0 year Discogs sends when the year is unknown", () => {
    expect(editionChips({ year: "0", country: "US" }).map((c) => c.label)).toEqual(["US"]);
  });

  it("skips what Discogs does not know", () => {
    const album = { uuid: "u2", id: "1", year: null, country: "France", label: null, catno: "9101 155", formats: [] };

    expect(editionChips(album).map((c) => c.label)).toEqual(["France", "9101 155"]);
  });
});

describe("EditionChips", () => {
  it("shows one chip per known detail", () => {
    render(<EditionChips album={original} />);

    expect(screen.getByText("1959")).toBeInTheDocument();
    expect(screen.getByText("Columbia CL 1355")).toBeInTheDocument();
    expect(screen.getByText("LP, Mono")).toBeInTheDocument();
  });

  it("renders nothing for results without edition details", () => {
    const { container } = render(<EditionChips album={{}} />);

    expect(container).toBeEmptyDOMElement();
  });
});
