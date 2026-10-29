import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ForgotPasswordModal from "@components/Login/ForgotPasswordModal";

const api = vi.hoisted(() => ({ forgotPassword: vi.fn() }));

vi.mock("@hooks/useDetectMobile", () => ({ default: () => ({ isMobile: false }) }));
vi.mock("@services/UserApiService", () => ({ userApiService: api }));

afterEach(cleanup);

describe("ForgotPasswordModal", () => {
  it("says what it is for before asking for the email", () => {
    render(<ForgotPasswordModal openForgotPassword setOpenForgotPassword={vi.fn()} setForgotPassword={vi.fn()} />);

    expect(screen.getByRole("presentation", { name: "Forgot your password?" })).toBeInTheDocument();
    expect(screen.getByText(/we send you a link to choose a new password/)).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send Reset Link" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
  });
});

describe("ForgotPasswordModal answer", () => {
  it("never claims a mail was sent: the account may not exist", async () => {
    api.forgotPassword.mockResolvedValue({ message: "ok" });
    const user = userEvent.setup();
    render(<ForgotPasswordModal openForgotPassword setOpenForgotPassword={vi.fn()} setForgotPassword={vi.fn()} />);

    await user.type(screen.getByLabelText("Email"), "someone@example.com");
    await user.click(screen.getByRole("button", { name: "Send Reset Link" }));

    expect(await screen.findByText(/If an account exists with this email/)).toBeInTheDocument();
    expect(screen.queryByText(/Mail sent/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByText(/If an account exists with this email/)).not.toBeInTheDocument();
  });
});
