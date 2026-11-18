import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CollectionReportMenu from "@components/Collections/CollectionReportMenu";

const api = vi.hoisted(() => ({ reportCollection: vi.fn() }));
vi.mock("@services/CollectionApiService", () => ({
  collectionApiService: api,
  COLLECTION_REPORT_REASONS: ["offensive", "spam", "other"],
}));

const renderMenu = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <CollectionReportMenu collectionId={4} collectionName="Bob's crates" />
    </QueryClientProvider>
  );

async function openReport() {
  await userEvent.click(screen.getByRole("button", { name: "More actions" }));
  await userEvent.click(screen.getByRole("menuitem", { name: "Report abuse" }));
  return screen.findByRole("dialog", { name: "Report this collection" });
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("CollectionReportMenu", () => {
  it("hides the report behind a discreet menu", () => {
    renderMenu();

    expect(screen.getByRole("button", { name: "More actions" })).toBeInTheDocument();
    expect(screen.queryByText("Report abuse")).not.toBeInTheDocument();
  });

  it("asks why, then sends the report once confirmed", async () => {
    api.reportCollection.mockResolvedValue({ message: "ok" });
    renderMenu();

    await openReport();
    expect(screen.getByText(/Why do you report Bob's crates\?/)).toBeInTheDocument();
    const send = screen.getByRole("button", { name: "Report" });
    expect(send).toBeDisabled();

    await userEvent.click(screen.getByRole("radio", { name: "Spam or advertising" }));
    await userEvent.type(screen.getByLabelText("Tell us more (optional)"), "Ads in every record");
    await userEvent.click(send);

    expect(await screen.findByText("Thanks, an admin will check this collection.")).toBeInTheDocument();
    expect(api.reportCollection).toHaveBeenCalledWith(4, "spam", "Ads in every record");
  });

  it("cancelling sends nothing", async () => {
    renderMenu();

    await openReport();
    await userEvent.click(screen.getByRole("radio", { name: "Something else" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(api.reportCollection).not.toHaveBeenCalled();
  });

  it("tells why the server refused it", async () => {
    api.reportCollection.mockRejectedValue({ code: 4009, message: "You already reported this collection: an admin will check it.", details: {} });
    renderMenu();

    await openReport();
    await userEvent.click(screen.getByRole("radio", { name: "Offensive or inappropriate content" }));
    await userEvent.click(screen.getByRole("button", { name: "Report" }));

    expect(await screen.findByText("You already reported this collection: an admin will check it.")).toBeInTheDocument();
  });
});
