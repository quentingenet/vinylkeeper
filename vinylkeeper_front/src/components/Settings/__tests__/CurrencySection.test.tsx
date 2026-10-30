import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CurrencySection from "@components/Settings/CurrencySection";

const api = vi.hoisted(() => ({ setCurrency: vi.fn() }));
vi.mock("@services/UserApiService", () => ({ userApiService: api }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const renderSection = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <CurrencySection currency="EUR" />
    </QueryClientProvider>
  );

describe("CurrencySection", () => {
  it("switches the collection value to dollars", async () => {
    api.setCurrency.mockResolvedValue({ message: "ok" });
    renderSection();

    expect(screen.getByRole("button", { name: "EUR €" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: "USD $" }));

    expect(api.setCurrency).toHaveBeenCalledWith("USD");
  });

  it("says when the change failed", async () => {
    api.setCurrency.mockRejectedValue(new Error("Failed to change the currency."));
    renderSection();

    await userEvent.click(screen.getByRole("button", { name: "USD $" }));

    expect(await screen.findByText("Failed to change the currency.")).toBeInTheDocument();
  });
});
