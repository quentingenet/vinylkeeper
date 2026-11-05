import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import OpenSharedCollection from "@pages/Collections/OpenSharedCollection";

const api = vi.hoisted(() => ({ getSharedCollection: vi.fn() }));
vi.mock("@services/CollectionApiService", () => ({ collectionApiService: api }));

const TOKEN = "0123456789abcdef0123456789abcdef";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const renderLink = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[`/shared/${TOKEN}`]}>
        <Routes>
          <Route path="/shared/:token" element={<OpenSharedCollection />} />
          <Route path="/collections/:id" element={<div>Full page of the collection</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );

describe("OpenSharedCollection", () => {
  it("takes a member to the full page", async () => {
    api.getSharedCollection.mockResolvedValue({ id: 12 });
    renderLink();

    expect(await screen.findByText("Full page of the collection")).toBeInTheDocument();
  });

  it("says when the collection became private", async () => {
    api.getSharedCollection.mockRejectedValue({ code: 4003, message: "private", details: {} });
    renderLink();

    expect(await screen.findByRole("heading", { name: "This collection is now private" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse community collections" })).toBeInTheDocument();
  });
});
