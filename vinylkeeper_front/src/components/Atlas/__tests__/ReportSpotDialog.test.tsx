import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReportSpotDialog from "@components/Atlas/ReportSpotDialog";

const api = vi.hoisted(() => ({ reportPlace: vi.fn() }));
vi.mock("@services/AtlasApiService", () => ({ atlasApiService: api }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const renderDialog = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <ReportSpotDialog open onClose={vi.fn()} placeId={3} placeName="Paris Jazz Corner" />
    </QueryClientProvider>
  );

describe("ReportSpotDialog", () => {
  it("offers every issue and waits for one to be ticked", () => {
    renderDialog();

    expect(screen.getByText("What is wrong about Paris Jazz Corner?")).toBeInTheDocument();
    for (const label of ["Name is wrong", "Description is wrong or outdated", "Address is wrong, or the spot has moved",
      "Website link is dead or outdated", "Spot type is wrong", "Permanently closed"]) {
      expect(screen.getByRole("checkbox", { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Send report" })).toBeDisabled();
  });

  it("sends the ticked issues with the comment, then thanks", async () => {
    api.reportPlace.mockResolvedValue({ message: "ok" });
    renderDialog();

    await userEvent.click(screen.getByRole("checkbox", { name: "Website link is dead or outdated" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Permanently closed" }));
    await userEvent.type(screen.getByLabelText("What should it be? (optional)"), "Closed since June");
    await userEvent.click(screen.getByRole("button", { name: "Send report" }));

    expect(api.reportPlace).toHaveBeenCalledWith(3, ["website", "closed"], "Closed since June");
    expect(await screen.findByText("Thanks, an admin will check this spot.")).toBeInTheDocument();
  });

  it("says when the spot was already reported", async () => {
    api.reportPlace.mockRejectedValue({ code: 2001, message: "You already reported this spot: an admin will check it.", details: {} });
    renderDialog();

    await userEvent.click(screen.getByRole("checkbox", { name: "Name is wrong" }));
    await userEvent.click(screen.getByRole("button", { name: "Send report" }));

    expect(await screen.findByText("You already reported this spot: an admin will check it.")).toBeInTheDocument();
  });
});
