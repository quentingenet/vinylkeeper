import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ChangePasswordSection from "@components/Settings/ChangePasswordSection";

const api = vi.hoisted(() => ({ changePassword: vi.fn() }));
vi.mock("@services/UserApiService", () => ({ userApiService: api }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const renderSection = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ChangePasswordSection />
    </QueryClientProvider>
  );

// The InputLabel of these fields is not tied to its input: find them by name
const field = (name: string) => document.querySelector<HTMLInputElement>(`input[name="${name}"]`)!;

const fill = async (newPassword: string, confirmPassword: string) => {
  await userEvent.type(field("currentPassword"), "old1");
  await userEvent.type(field("newPassword"), newPassword);
  await userEvent.type(field("confirmPassword"), confirmPassword);
};

describe("ChangePasswordSection", () => {
  it("keeps the button off while the confirmation differs", async () => {
    renderSection();

    await fill("secret1", "secret2");

    expect(await screen.findByText("It must be the same as the new password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Change Password" })).toBeDisabled();
  });

  it("changes the password and empties the form", async () => {
    api.changePassword.mockResolvedValue({ message: "ok" });
    renderSection();

    await fill("secret1", "secret1");
    await userEvent.click(screen.getByRole("button", { name: "Change Password" }));

    expect(await screen.findByText("Password changed successfully!")).toBeInTheDocument();
    expect(api.changePassword.mock.calls[0][0]).toEqual({
      currentPassword: "old1",
      newPassword: "secret1",
      confirmPassword: "secret1",
    });
    expect(field("newPassword")).toHaveValue("");
  });

  it("says when the current password is wrong", async () => {
    api.changePassword.mockRejectedValue(new Error("Wrong current password."));
    renderSection();

    await fill("secret1", "secret1");
    await userEvent.click(screen.getByRole("button", { name: "Change Password" }));

    expect(await screen.findByText("Wrong current password.")).toBeInTheDocument();
  });
});
