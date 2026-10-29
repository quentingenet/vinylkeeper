import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AddRecordProvider from "@components/AddRecord/AddRecordProvider";
import AddRecordFab from "@components/AddRecord/AddRecordFab";
import OpenAddRecordRoute from "@components/AddRecord/OpenAddRecordRoute";
import type { AddRecordOptions } from "@contexts/AddRecordContext";

const opened = vi.hoisted(() => ({ options: [] as AddRecordOptions[] }));

// The dialog itself is tested on its own: here, only what opens it and with which options
vi.mock("@components/AddRecord/AddRecordDialog", () => ({
  default: ({ options, onClose }: { options: AddRecordOptions; onClose: () => void }) => {
    opened.options.push(options);
    return (
      <div role="dialog">
        <button onClick={onClose}>Close</button>
      </div>
    );
  },
}));
vi.mock("@hooks/useDetectMobile", () => ({ default: () => ({ isMobile: false }) }));

afterEach(() => {
  cleanup();
  opened.options = [];
});

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AddRecordProvider>
        <Routes>
          <Route path="/add-vinyls" element={<OpenAddRecordRoute />} />
          <Route path="/dashboard" element={<div>Dashboard page</div>} />
          <Route path="*" element={<div>Some page</div>} />
        </Routes>
        <AddRecordFab />
      </AddRecordProvider>
    </MemoryRouter>
  );

describe("AddRecordFab", () => {
  it("opens the dialog from any page and hides while it is open", async () => {
    renderAt("/collections");

    await userEvent.click(screen.getByRole("button", { name: "Add a record" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add a record" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.getByRole("button", { name: "Add a record" })).toBeInTheDocument();
  });

  it("is not shown on the Atlas, which has its own add button", () => {
    renderAt("/atlas");

    expect(screen.queryByRole("button", { name: "Add a record" })).not.toBeInTheDocument();
  });
});

describe("/add-vinyls", () => {
  it("opens the dialog over the dashboard", async () => {
    renderAt("/add-vinyls");

    expect(await screen.findByText("Dashboard page")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("keeps the search and the pressing to replace of older links", async () => {
    renderAt("/add-vinyls?q=Brel+-+Brel&replaceCollection=7&replaceAlbum=10");

    await screen.findByText("Dashboard page");
    expect(opened.options[opened.options.length - 1]).toEqual({
      initialQuery: "Brel - Brel",
      replaceTarget: { collectionId: 7, albumId: 10, title: "Brel - Brel" },
    });
  });
});
