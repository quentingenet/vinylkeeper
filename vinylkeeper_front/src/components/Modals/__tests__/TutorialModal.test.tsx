import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TutorialModal from "@components/Modals/TutorialModal";

afterEach(cleanup);

describe("TutorialModal", () => {
  it("walks through the steps and closes from the last one", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<TutorialModal open onClose={onClose} />);

    expect(screen.getByText("Welcome to VinylKeeper")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Add Vinyls" })).toHaveAttribute("src", "/vk_tutorial/1_add_vinyl.jpg");
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("img", { name: "Collections" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Get Started" }));

    expect(onClose).toHaveBeenCalledOnce();
  });
});
