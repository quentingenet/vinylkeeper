import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ResetPasswordForm from "@components/ResetPassword/ResetPasswordForm";


const api = vi.hoisted(() => ({ resetPassword: vi.fn(), checkResetToken: vi.fn() }));
const navigate = vi.hoisted(() => vi.fn());

vi.mock("@services/UserApiService", () => ({ userApiService: api }));
vi.mock("@hooks/useDetectMobile", () => ({ default: () => ({ isMobile: false }) }));
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useNavigate: () => navigate,
}));

const LINK_UNUSABLE = "This link has expired or was already used. Request a new one from the login page.";

beforeEach(() => {
  api.checkResetToken.mockResolvedValue(undefined);
});

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

    await fill("secret12", "other1");

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

    await fill("secret12", "secret12");
    await vi.waitFor(() => expect(screen.getByRole("button", { name: "Submit" })).toBeEnabled());
    await userEvent.click(screen.getByRole("button", { name: "Submit" }));

    await vi.waitFor(() =>
      expect(api.resetPassword).toHaveBeenCalledWith({ token: "tok-1", new_password: "secret12" })
    );
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith("/"));
  });

  it("says when the reset failed", async () => {
    api.resetPassword.mockRejectedValue(new Error("expired"));
    renderForm();

    await fill("secret12", "secret12");
    await vi.waitFor(() => expect(screen.getByRole("button", { name: "Submit" })).toBeEnabled());
    await userEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(await screen.findByText("Error while resetting password. Try again.")).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("checks the link when the page opens", async () => {
    renderForm();

    await vi.waitFor(() => expect(api.checkResetToken).toHaveBeenCalledWith("tok-1"));
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("replaces the form by a clear message when the link was already used or has expired", async () => {
    api.checkResetToken.mockRejectedValue(new Error(LINK_UNUSABLE));
    renderForm();

    expect(await screen.findByText(LINK_UNUSABLE)).toBeInTheDocument();
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Back to login" }));
    expect(navigate).toHaveBeenCalledWith("/");
  });

  it("keeps the form when the check itself fails (network)", async () => {
    api.checkResetToken.mockRejectedValue(new Error("The link could not be checked. Please try again."));
    renderForm();

    await vi.waitFor(() => expect(api.checkResetToken).toHaveBeenCalled());
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("says the link is unusable when sending the new password gets that answer", async () => {
    api.resetPassword.mockRejectedValue(new Error(LINK_UNUSABLE));
    renderForm();

    await fill("secret12", "secret12");
    await vi.waitFor(() => expect(screen.getByRole("button", { name: "Submit" })).toBeEnabled());
    await userEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(await screen.findByText(LINK_UNUSABLE)).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("does not offer a form for a link without token", () => {
    render(
      <MemoryRouter initialEntries={["/reset-password"]}>
        <ResetPasswordForm />
      </MemoryRouter>
    );

    expect(screen.getByText(LINK_UNUSABLE)).toBeInTheDocument();
    expect(api.checkResetToken).not.toHaveBeenCalled();
  });
});
