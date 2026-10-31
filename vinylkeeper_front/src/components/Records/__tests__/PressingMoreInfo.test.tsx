import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PressingMoreInfo from "@components/Records/PressingMoreInfo";

const metadata = vi.hoisted(() => ({ useAlbumMetadata: vi.fn() }));
vi.mock("@services/MusicMetadataService", () => metadata);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("PressingMoreInfo", () => {
  it("loads nothing until asked for", () => {
    metadata.useAlbumMetadata.mockReturnValue({ data: undefined, isLoading: false, isError: false });
    render(<PressingMoreInfo releaseId="4570366" />);

    expect(metadata.useAlbumMetadata).toHaveBeenLastCalledWith(undefined);
    expect(screen.queryByText("Barcode")).not.toBeInTheDocument();
  });

  it("shows the release date, barcode and matrix of the pressing", async () => {
    metadata.useAlbumMetadata.mockReturnValue({
      data: { released: "2013-05-17", barcode: "8 88837 16861 8", matrix: ["AL88883716861-2 A2", "BL88883716861-2 B1"] },
      isLoading: false,
      isError: false,
    });
    render(<PressingMoreInfo releaseId="4570366" />);

    await userEvent.click(screen.getByRole("button", { name: "More about this pressing" }));

    expect(metadata.useAlbumMetadata).toHaveBeenLastCalledWith(expect.objectContaining({ id: "4570366" }));
    expect(screen.getByText("17 May 2013")).toBeInTheDocument();
    expect(screen.getByText("8 88837 16861 8")).toBeInTheDocument();
    expect(screen.getByText("BL88883716861-2 B1")).toBeInTheDocument();
  });

  it("says when Discogs has nothing more", async () => {
    metadata.useAlbumMetadata.mockReturnValue({ data: { matrix: [] }, isLoading: false, isError: false });
    render(<PressingMoreInfo releaseId="1" />);

    await userEvent.click(screen.getByRole("button", { name: "More about this pressing" }));

    expect(screen.getByText("No more details on Discogs for this pressing.")).toBeInTheDocument();
  });
});
