import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PressingSection from "@components/Modals/PressingSection";

afterEach(cleanup);

const edition = { year: "2010", country: "US", label: "Columbia", catno: "88697680571", formats: ["LP", "Reissue"] };

describe("PressingSection", () => {
  it("states the pressing of a search result as it is", () => {
    render(<PressingSection edition={edition} />);

    expect(screen.getByText("Columbia 88697680571")).toBeInTheDocument();
    expect(screen.queryByText(/Is this your copy/)).not.toBeInTheDocument();
  });

  it("asks the owner to confirm an unconfirmed pressing", async () => {
    const onConfirm = vi.fn();
    render(<PressingSection edition={edition} confirmed={false} canConfirm onConfirm={onConfirm} />);

    expect(screen.getByText(/Is this your copy\?/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Yes, this is my pressing" }));

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("lets the owner look for the right pressing", async () => {
    const onFindPressing = vi.fn();
    render(
      <PressingSection edition={edition} confirmed={false} canConfirm onConfirm={vi.fn()} onFindPressing={onFindPressing} />
    );

    await userEvent.click(screen.getByRole("button", { name: "No, find my pressing" }));

    expect(onFindPressing).toHaveBeenCalledOnce();
  });

  it("tells visitors the pressing is not confirmed, without a button", () => {
    render(<PressingSection edition={edition} confirmed={false} />);

    expect(screen.getByText("Pressing not confirmed by the owner.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("adds nothing once confirmed", () => {
    render(<PressingSection edition={edition} confirmed canConfirm onConfirm={vi.fn()} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText(/confirm/i)).not.toBeInTheDocument();
  });

  it("renders nothing without pressing details", () => {
    const { container } = render(<PressingSection edition={{}} confirmed={false} canConfirm />);

    expect(container).toBeEmptyDOMElement();
  });
});
