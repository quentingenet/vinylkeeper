import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ResetPasswordForm from "@components/ResetPassword/ResetPasswordForm";

const api = vi.hoisted(() => ({ resetPassword: vi.fn() }));
const navigate = vi.hoisted(() => vi.fn());

vi.mock("@services/UserApiService", () => ({ userApiService: api }));
vi.mock("@hooks/useDetectMobile", () => ({ default: () => ({ isMobile: false }) }));
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useNavigate: () => navigate,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const renderForm = () =>
  render(
    <MemoryRouter initialEntries={["/reset-password?token=tok-1"]}>
      <ResetPasswordForm />
    </MemoryRouter>
  );

const fill = async (password: string, passwordBis: string) => {
  await userEvent.type(screen.getByLabelText("Password"), password);
  await userEvent.type(screen.getByLabelText("Confirm new password"), passwordBis);
};

// Submit stays disabled until the schema accepts both fields
describe("ResetPasswordForm", () => {
  it("cannot be sent with two different passwords", async () => {
    renderForm();

    await fill("secret1", "other1");

    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
  });

  it("cannot be sent with a password without a number", async () => {
    renderForm();

    await fill("secret", "secret");

    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
  });

  it("sends the token of the link with the new password", async () => {
    api.resetPassword.mockResolvedValue({ message: "ok" });
    renderForm();

    await fill("secret1", "secret1");
    await vi.waitFor(() => expect(screen.getByRole("button", { name: "Submit" })).toBeEnabled());
    await userEvent.click(screen.getByRole("button", { name: "Submit" }));

    await vi.waitFor(() =>
      expect(api.resetPassword).toHaveBeenCalledWith({ token: "tok-1", new_password: "secret1" })
    );
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith("/"));
  });

  it("says when the reset failed", async () => {
    api.resetPassword.mockRejectedValue(new Error("expired"));
    renderForm();

    await fill("secret1", "secret1");
    await vi.waitFor(() => expect(screen.getByRole("button", { name: "Submit" })).toBeEnabled());
    await userEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(await screen.findByText("Error while resetting password. Try again.")).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });
});
