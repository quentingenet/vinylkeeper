import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AuthSwitchLink from "@components/Auth/AuthSwitchLink";

afterEach(cleanup);

describe("AuthSwitchLink", () => {
  it("renders the prompt and calls onClick from the action", async () => {
    const onClick = vi.fn();
    render(<AuthSwitchLink prompt="No account yet?" actionLabel="Sign up" onClick={onClick} />);

    expect(screen.getByText(/No account yet\?/)).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Sign up" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not submit the surrounding form", async () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <AuthSwitchLink prompt="No account yet?" actionLabel="Sign up" onClick={vi.fn()} />
      </form>
    );

    await userEvent.setup().click(screen.getByRole("button", { name: "Sign up" }));

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
