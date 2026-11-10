import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import ModalTermsVinylKeeper, { TERMS_LAST_UPDATED } from "@components/Modals/ModalTermsVinylKeeper";

afterEach(cleanup);

describe("ModalTermsVinylKeeper", () => {
  it("tells that the dashboard shows the latest additions of every collection, private ones too", () => {
    render(<ModalTermsVinylKeeper openTermsModal setOpenTermsModal={vi.fn()} />);

    expect(
      screen.getByText(
        /The latest records and artists added by members, with the username of who added them, appear on the dashboard of every member, whether the collection they were added to is public or private\./
      )
    ).toBeInTheDocument();
  });

  it("is dated of the version that tells it", () => {
    render(<ModalTermsVinylKeeper openTermsModal setOpenTermsModal={vi.fn()} />);

    expect(TERMS_LAST_UPDATED).toBe("10/11/2026");
    expect(screen.getByText(`Last updated: ${TERMS_LAST_UPDATED}`)).toBeInTheDocument();
  });
});
