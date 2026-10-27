import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PreviewModal from "@components/Landpage/PreviewModal";
import type { PreviewSlide } from "@components/Landpage/previewSlides";

afterEach(cleanup);

const slides: PreviewSlide[] = [
  { title: "Dashboard", description: "Stats at a glance", image: "/a.jpg" },
  { title: "Collections", description: "Your records", image: "/b.jpg" },
  { title: "Places", description: "Vinyl spots", image: "/c.jpg" },
];

const renderModal = (props: Partial<React.ComponentProps<typeof PreviewModal>> = {}) =>
  render(
    <PreviewModal open slides={slides} onClose={vi.fn()} onEnter={vi.fn()} {...props} />
  );

const currentSlideImage = () => screen.getByRole("img");

describe("PreviewModal", () => {
  it("opens on the first screenshot with its caption", () => {
    renderModal();

    expect(screen.getByRole("dialog", { name: "A look inside VinylKeeper" })).toBeInTheDocument();
    expect(currentSlideImage()).toHaveAttribute("src", "/a.jpg");
    expect(screen.getByText("Stats at a glance")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous screenshot" })).toBeDisabled();
  });

  it("navigates with the arrows and stops at the last screenshot", async () => {
    const user = userEvent.setup();
    renderModal();
    const next = screen.getByRole("button", { name: "Next screenshot" });

    await user.click(next);
    expect(currentSlideImage()).toHaveAttribute("src", "/b.jpg");
    await user.click(next);
    expect(currentSlideImage()).toHaveAttribute("src", "/c.jpg");
    expect(next).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Previous screenshot" }));
    expect(currentSlideImage()).toHaveAttribute("src", "/b.jpg");
  });

  it("jumps to a screenshot from its dot", async () => {
    renderModal();

    const dot = screen.getByRole("button", { name: "Show screenshot 3: Places" });
    await userEvent.setup().click(dot);

    expect(currentSlideImage()).toHaveAttribute("src", "/c.jpg");
    expect(dot).toHaveAttribute("aria-current", "true");
  });

  it("supports keyboard arrows", async () => {
    const user = userEvent.setup();
    renderModal();
    screen.getByRole("dialog").focus();

    await user.keyboard("{ArrowRight}");
    expect(currentSlideImage()).toHaveAttribute("src", "/b.jpg");
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(currentSlideImage()).toHaveAttribute("src", "/a.jpg");
  });

  it("calls onEnter from the Enter button", async () => {
    const onEnter = vi.fn();
    renderModal({ onEnter });

    await userEvent.setup().click(screen.getByRole("button", { name: "Enter" }));

    expect(onEnter).toHaveBeenCalledOnce();
  });

  it("restarts from the first screenshot after being closed", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { rerender } = renderModal({ onClose });

    await user.click(screen.getByRole("button", { name: "Next screenshot" }));
    await user.click(screen.getByRole("button", { name: "Close preview" }));
    expect(onClose).toHaveBeenCalledOnce();

    rerender(<PreviewModal open slides={slides} onClose={onClose} onEnter={vi.fn()} />);
    expect(currentSlideImage()).toHaveAttribute("src", "/a.jpg");
  });
});
