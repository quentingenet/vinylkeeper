import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AtlasSpotAddModal from "@components/Atlas/AtlasSpotAddModal";

const api = vi.hoisted(() => ({ getPlaceTypes: vi.fn() }));
vi.mock("@services/AtlasApiService", () => ({ atlasApiService: api }));

beforeEach(() => {
  api.getPlaceTypes.mockResolvedValue([{ id: 2, name: "Record store" }]);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ name: "France", code: "FR" }, { name: "Spain", code: "ES" }]),
    })
  );
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

const renderModal = (onSubmit = vi.fn().mockResolvedValue(undefined)) => {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <AtlasSpotAddModal open onClose={vi.fn()} onSubmit={onSubmit} isMobile={false} />
    </QueryClientProvider>
  );
  return onSubmit;
};

const fillRequired = async () => {
  await userEvent.type(screen.getByLabelText("Spot name"), "Disques Paris");
  // The InputLabel of the select is not tied to it: reach it from its form control
  const typeControl = screen.getAllByText("Spot type")[0].closest<HTMLElement>(".MuiFormControl-root")!;
  await userEvent.click(within(typeControl).getByRole("combobox"));
  await userEvent.click(await screen.findByRole("option", { name: "Record store" }));
  await userEvent.type(screen.getByLabelText("City"), "Paris");
  await userEvent.type(screen.getByLabelText("Address"), "1 rue du Vinyle");
};

describe("AtlasSpotAddModal", () => {
  it("lists the missing fields and sends nothing", async () => {
    const onSubmit = renderModal();

    await userEvent.click(screen.getByRole("button", { name: "Add to the Atlas" }));

    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(screen.getByText("City is required")).toBeInTheDocument();
    expect(screen.getByText("Address is required")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("refuses a source that is not a link", async () => {
    const onSubmit = renderModal();

    await fillRequired();
    await userEvent.type(screen.getByLabelText("Source URL (optional)"), "not a link");
    await userEvent.click(screen.getByRole("button", { name: "Add to the Atlas" }));

    expect(await screen.findByText("Must be a valid URL")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("sends the spot with France by default and the optional fields empty", async () => {
    const onSubmit = renderModal();

    await fillRequired();
    await userEvent.click(screen.getByRole("button", { name: "Add to the Atlas" }));

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toEqual({
      name: "Disques Paris",
      place_type_id: 2,
      country: "France",
      city: "Paris",
      address: "1 rue du Vinyle",
      description: "",
      source_url: "",
    });
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("shows why the spot was not added", async () => {
    renderModal(vi.fn().mockRejectedValue(new Error("boom")));

    await fillRequired();
    await userEvent.click(screen.getByRole("button", { name: "Add to the Atlas" }));

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("Failed to add the spot. Please try again.")).toBeInTheDocument();
  });
});
