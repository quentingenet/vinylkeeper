import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import EmailSection from "@components/Settings/EmailSection";

const api = vi.hoisted(() => ({ requestEmailChange: vi.fn(), resendEmailConfirmation: vi.fn() }));
vi.mock("@services/UserApiService", () => ({ userApiService: api }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const renderSection = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <EmailSection email="jane@example.com" isEmailConfirmed />
    </QueryClientProvider>
  );

// The InputLabel of the password is not tied to its input: find it by name
const passwordField = () => document.querySelector<HTMLInputElement>('input[name="currentPassword"]')!;

describe("EmailSection", () => {
  it("keeps the button off and explains an invalid email", async () => {
    renderSection();

    await userEvent.type(screen.getByLabelText("New email"), "not-an-email");
    await userEvent.type(passwordField(), "secret1");

    expect(await screen.findByText("Email not valid")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Change email" })).toBeDisabled();
  });

  it("asks for the change with the current password", async () => {
    api.requestEmailChange.mockResolvedValue({ message: "Check your new inbox" });
    renderSection();

    await userEvent.type(screen.getByLabelText("New email"), "new@example.com");
    await userEvent.type(passwordField(), "secret1");
    await userEvent.click(screen.getByRole("button", { name: "Change email" }));

    expect(await screen.findByText(/Check your new inbox\. Your current email address stays in use/)).toBeInTheDocument();
    expect(api.requestEmailChange.mock.calls[0][0]).toEqual({ newEmail: "new@example.com", currentPassword: "secret1" });
  });

  it("shows the error of the API", async () => {
    api.requestEmailChange.mockRejectedValue(new Error("Wrong current password."));
    renderSection();

    await userEvent.type(screen.getByLabelText("New email"), "new@example.com");
    await userEvent.type(passwordField(), "nope1");
    await userEvent.click(screen.getByRole("button", { name: "Change email" }));

    expect(await screen.findByText("Wrong current password.")).toBeInTheDocument();
  });
});
