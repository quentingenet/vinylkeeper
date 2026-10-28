import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import OwnedPressingsSection from "@components/Modals/OwnedPressingsSection";

const api = vi.hoisted(() => ({ findOwnedPressings: vi.fn() }));
vi.mock("@services/ExternalReferenceService", () => ({ externalReferenceApiService: api }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const owned = (overrides = {}) => ({
  collection_id: 7, collection_name: "Jazz shelf", album_id: 1, external_album_id: "2252871",
  same_release: true, pressing_confirmed: true, copies_count: 1, release_year: 1959, country: "US",
  label: "Columbia", catno: "CL 1355", formats: ["LP", "Mono"], ...overrides,
});

const renderSection = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <OwnedPressingsSection externalId="2252871" masterId="5460" />
    </QueryClientProvider>
  );

describe("OwnedPressingsSection", () => {
  it("lists every pressing owned of the work, with its collection and copies", async () => {
    api.findOwnedPressings.mockResolvedValue([
      owned(),
      owned({ album_id: 2, collection_name: "Sundays", release_year: 2010, catno: "88697", copies_count: 2,
        pressing_confirmed: false }),
    ]);
    renderSection();

    expect(await screen.findByText("Your pressings")).toBeInTheDocument();
    expect(screen.getByText("Columbia CL 1355")).toBeInTheDocument();
    expect(screen.getByText(/Sundays\s+×2/)).toBeInTheDocument();
    expect(screen.getByText(/Pressing not confirmed yet/)).toBeInTheDocument();
    expect(api.findOwnedPressings).toHaveBeenCalledWith("2252871", "5460");
  });

  it("shows nothing when nothing is found", async () => {
    api.findOwnedPressings.mockResolvedValue([]);
    const { container } = renderSection();

    await vi.waitFor(() => expect(api.findOwnedPressings).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
