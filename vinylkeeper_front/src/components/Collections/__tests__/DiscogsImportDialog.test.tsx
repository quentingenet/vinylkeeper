import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, act, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import DiscogsImportDialog, { RESULT_DURATION_MS } from "@components/Collections/DiscogsImportDialog";
import { IMPORT_CONDITIONS } from "@components/Collections/discogsImportLabels";
import type { DiscogsImport } from "@models/IDiscogsImport";

const api = vi.hoisted(() => ({ preview: vi.fn(), getCollections: vi.fn() }));

vi.mock("@services/DiscogsImportApiService", () => ({ discogsImportApiService: { preview: api.preview } }));
vi.mock("@services/CollectionApiService", () => ({ collectionApiService: { getCollections: api.getCollections } }));
vi.mock("@hooks/useDetectMobile", () => ({ default: () => ({ isMobile: false }) }));
vi.mock("@contexts/UserContext", () => ({ useUserContext: () => ({ currentUser: { user_uuid: "u-1" } }) }));

afterEach(cleanup);
beforeEach(() => {
  api.preview.mockReset();
  api.getCollections.mockResolvedValue({ items: [{ id: 7, name: "My shelf" }], total: 1, page: 1, limit: 100, total_pages: 1 });
});

const renderDialog = (latestImport: DiscogsImport | null = null, onStart = vi.fn()) => {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <DiscogsImportDialog
          open
          onClose={vi.fn()}
          latestImport={latestImport}
          onStart={onStart}
          isStarting={false}
          startError={null}
        />
      </MemoryRouter>
    </QueryClientProvider>
  );
  return onStart;
};

const checkUsername = async (name: string) => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Discogs username"), name);
  await user.click(screen.getByRole("button", { name: "Check" }));
  return user;
};

describe("DiscogsImportDialog", () => {
  it("lists the conditions before anything else", () => {
    renderDialog();

    const conditions = screen.getByRole("list", { name: "Conditions to import a Discogs collection" });
    IMPORT_CONDITIONS.forEach((condition) => expect(conditions).toHaveTextContent(condition));
    expect(screen.getByRole("button", { name: "Import" })).toBeDisabled();
  });

  it("imports into a new collection by default once the collection is checked", async () => {
    api.preview.mockResolvedValue({ discogs_username: "kent", items_total: 1500 });
    const onStart = renderDialog();

    const user = await checkUsername("kent");

    expect(await screen.findByText(/1500 items found in this Discogs collection/)).toBeInTheDocument();
    expect(screen.getByText("New collection: Discogs import (kent)")).toBeInTheDocument();
    expect(screen.getByText("A private collection is created: deleting it undoes the import.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Import" }));
    expect(onStart).toHaveBeenCalledWith("kent", null, false, false);
  });

  it("saves a copy of an existing collection first, unless unchecked", async () => {
    api.preview.mockResolvedValue({ discogs_username: "kent", items_total: 10 });
    const onStart = renderDialog();
    const user = await checkUsername("kent");
    await screen.findByText(/10 items found/);

    await user.click(screen.getByLabelText("Import into"));
    await user.click(await screen.findByRole("option", { name: "My shelf" }));

    const checkbox = screen.getByRole("checkbox", { name: "Save a copy of “My shelf” before importing" });
    expect(checkbox).toBeChecked();
    expect(screen.getByText(/The copy is named “SAVE My shelf \(\d{4}-\d{2}-\d{2}\)”/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Import" }));
    expect(onStart).toHaveBeenLastCalledWith("kent", 7, true, false);

    await user.click(checkbox);
    expect(screen.getByText(/there is no undo/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Import" }));
    expect(onStart).toHaveBeenLastCalledWith("kent", 7, false, false);
  });

  it("keeps the save a collection already has instead of a second one", async () => {
    api.getCollections.mockResolvedValue({
      items: [{ id: 7, name: "My shelf", save_collection_id: 8, save_collection_name: "SAVE My shelf (2026-10-28)" }],
      total: 1, page: 1, limit: 100, total_pages: 1,
    });
    api.preview.mockResolvedValue({ discogs_username: "kent", items_total: 10 });
    const onStart = renderDialog();
    const user = await checkUsername("kent");
    await screen.findByText(/10 items found/);

    await user.click(screen.getByLabelText("Import into"));
    await user.click(await screen.findByRole("option", { name: "My shelf" }));

    expect(screen.queryByRole("checkbox", { name: /Save a copy/ })).not.toBeInTheDocument();
    const warning = screen.getByText(/This collection already has a save: “SAVE My shelf \(2026-10-28\)”/);
    expect(warning).toHaveTextContent("Only one save per collection");
    expect(warning).toHaveTextContent("is not updated with the current records");
    await user.click(screen.getByRole("button", { name: "Import" }));
    expect(onStart).toHaveBeenLastCalledWith("kent", 7, true, false);
  });

  it("imports the wantlist too when the box is ticked, and says its size", async () => {
    api.preview.mockResolvedValue({ discogs_username: "kent", items_total: 10, wantlist_items_total: 12, wantlist_private: false });
    const onStart = renderDialog();
    const user = await checkUsername("kent");
    await screen.findByText(/10 items found/);

    const box = screen.getByRole("checkbox", { name: "Also import my Discogs wantlist (12 items) into my wishlist" });
    expect(box).not.toBeChecked();
    await user.click(box);
    expect(screen.getByText(
      "10 items in this Discogs collection and 12 in its wantlist. Only the vinyl records will be imported."
    )).toBeInTheDocument();
    expect(screen.getByText(/Your wantlist must be public/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Import" }));

    expect(onStart).toHaveBeenLastCalledWith("kent", null, false, true);
  });

  it("does not offer a private wantlist, and says why", async () => {
    api.preview.mockResolvedValue({ discogs_username: "kent", items_total: 10, wantlist_items_total: null, wantlist_private: true });
    const onStart = renderDialog();
    const user = await checkUsername("kent");
    await screen.findByText(/10 items found/);

    expect(screen.getByRole("checkbox", { name: /Also import my Discogs wantlist/ })).toBeDisabled();
    expect(screen.getByText("Your Discogs wantlist is private: make it public to import it.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Import" }));

    expect(onStart).toHaveBeenLastCalledWith("kent", null, false, false);
  });

  it("shows why a collection cannot be imported", async () => {
    api.preview.mockRejectedValue({ code: 3000, message: "This Discogs collection is private.", details: {} });
    renderDialog();

    await checkUsername("kent");

    expect(await screen.findByText("This Discogs collection is private.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Import" })).toBeDisabled();
  });

  it("refuses a username Discogs cannot have, without calling the API", async () => {
    renderDialog();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Discogs username"), "kent/../admin");

    expect(screen.getByText("Letters, digits, dots, hyphens and underscores only")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check" })).toBeDisabled();
    expect(api.preview).not.toHaveBeenCalled();
  });

  it("shows the progress of a running import instead of the form", () => {
    renderDialog({
      id: 1, collection_id: 5, discogs_username: "kent", created_collection: true,
      saved_copy_collection_id: null, saved_copy_name: null, status: "running",
      include_wantlist: false, phase: "collection", wantlist_items_total: 0, wantlist_vinyl_found: 0,
      wantlist_other_formats: 0, wantlist_added: 0, wantlist_already_in_wishlist: 0, wantlist_owned: 0,
      wantlist_other_pressings_owned: 0, wantlist_error: null,
      pages_total: 15, pages_done: 6, items_total: 1500, vinyl_found: 0, other_formats: 0, added: 0,
      copies_added: 0, already_in_collection: 0, other_pressings: 0, in_other_collections: 0,
      error_message: null, created_at: "2026-10-29T10:00:00Z", finished_at: null,
    });

    expect(screen.getByText("Reading your Discogs collection: page 6 of 15.")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Import progress" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Discogs username")).not.toBeInTheDocument();
  });
});

describe("DiscogsImportDialog result", () => {
  const finished = (overrides: Partial<DiscogsImport>): DiscogsImport => ({
    id: 3, collection_id: 5, discogs_username: "kent", created_collection: true,
    saved_copy_collection_id: null, saved_copy_name: null, status: "done",
    include_wantlist: false, phase: "collection", wantlist_items_total: 0, wantlist_vinyl_found: 0,
    wantlist_other_formats: 0, wantlist_added: 0, wantlist_already_in_wishlist: 0, wantlist_owned: 0,
    wantlist_other_pressings_owned: 0, wantlist_error: null,
    pages_total: 1, pages_done: 1, items_total: 2, vinyl_found: 2, other_formats: 0, added: 2,
    copies_added: 2, already_in_collection: 0, other_pressings: 0, in_other_collections: 0,
    error_message: null, created_at: "2026-10-29T10:00:00Z", finished_at: "2026-10-29T10:01:00Z",
    ...overrides,
  });

  beforeEach(() => localStorage.clear());
  afterEach(() => vi.useRealTimers());

  it("closes with its close button and stays closed", async () => {
    renderDialog(finished({}));
    const user = userEvent.setup();

    const summary = screen.getByText(/Last import from kent: 2 records added/);
    await user.click(within(summary.closest('[role="alert"]') as HTMLElement).getByRole("button", { name: "Close" }));

    expect(screen.queryByText(/Last import from kent/)).not.toBeInTheDocument();
    cleanup();
    renderDialog(finished({}));
    expect(screen.queryByText(/Last import from kent/)).not.toBeInTheDocument();
  });

  it("closes a failure by itself after 15 seconds", () => {
    vi.useFakeTimers();
    renderDialog(finished({ id: 4, status: "failed", error_message: "This Discogs collection is private." }));

    expect(screen.getByText("This Discogs collection is private.")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(RESULT_DURATION_MS);
    });

    expect(screen.queryByText("This Discogs collection is private.")).not.toBeInTheDocument();
  });

  it("shows the result of a newer import even after an older one was closed", () => {
    localStorage.setItem("vk_discogs_import_dismissed_u-1", "3");
    renderDialog(finished({ id: 8, added: 5, copies_added: 5 }));

    expect(screen.getByText(/Last import from kent: 5 records added/)).toBeInTheDocument();
  });
});
