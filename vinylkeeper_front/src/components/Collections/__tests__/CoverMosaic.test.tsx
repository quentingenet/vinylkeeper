import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import CoverMosaic, { MOSAIC_COVERS_COUNT } from "@components/Collections/CoverMosaic";

afterEach(cleanup);

const discogsCovers = (count: number) =>
  Array.from({ length: count }, (_, i) => `https://i.discogs.com/cover-${i}.jpg`);

const mosaicImages = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('[data-testid="cover-mosaic"] img'));

describe("CoverMosaic", () => {
  it("needs exactly 6 covers for a 3×2 grid", () => {
    expect(MOSAIC_COVERS_COUNT).toBe(6);
  });

  it.each([0, 1, 5])("shows the default artwork with %i cover(s)", (count) => {
    render(<CoverMosaic images={discogsCovers(count)} />);

    expect(screen.getByTestId("cover-mosaic-fallback")).toBeInTheDocument();
    expect(screen.queryByTestId("cover-mosaic")).not.toBeInTheDocument();
  });

  it("shows a 6-cover mosaic through the image proxy", () => {
    const { container } = render(<CoverMosaic images={discogsCovers(6)} />);

    const images = mosaicImages(container);
    expect(images).toHaveLength(6);
    images.forEach((img) => {
      expect(img.getAttribute("src")).toContain("/images/proxy");
      expect(img).toHaveAttribute("alt", "");
      expect(img).toHaveAttribute("loading", "lazy");
    });
    expect(screen.queryByTestId("cover-mosaic-fallback")).not.toBeInTheDocument();
  });

  it("only uses the first 6 covers when more are provided", () => {
    const { container } = render(<CoverMosaic images={discogsCovers(8)} />);

    expect(mosaicImages(container)).toHaveLength(6);
  });

  it("does not count covers the proxy cannot serve", () => {
    const covers = [...discogsCovers(5), "https://example.com/not-discogs.jpg"];
    render(<CoverMosaic images={covers} />);

    expect(screen.getByTestId("cover-mosaic-fallback")).toBeInTheDocument();
  });

  it("falls back to the default artwork when a cover fails to load", () => {
    const { container } = render(<CoverMosaic images={discogsCovers(6)} />);

    fireEvent.error(mosaicImages(container)[3]);

    expect(screen.getByTestId("cover-mosaic-fallback")).toBeInTheDocument();
    expect(screen.queryByTestId("cover-mosaic")).not.toBeInTheDocument();
  });

  it("supports two albums sharing the same cover", () => {
    const covers = [...discogsCovers(5), "https://i.discogs.com/cover-0.jpg"];
    const { container } = render(<CoverMosaic images={covers} />);

    expect(mosaicImages(container)).toHaveLength(6);
  });
});
