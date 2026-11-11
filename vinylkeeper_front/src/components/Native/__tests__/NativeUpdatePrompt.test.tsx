import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NativeUpdatePrompt from "@components/Native/NativeUpdatePrompt";

const native = vi.hoisted(() => ({ value: true }));
vi.mock("@utils/CapacitorUtils", () => ({
  isCapacitorPlatform: () => native.value,
}));
vi.mock("@utils/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn() } }));
vi.mock("@capacitor/app", () => ({
  App: { addListener: vi.fn(() => Promise.resolve({ remove: vi.fn() })) },
}));

const update = vi.hoisted(() => ({
  stateListener: undefined as
    undefined | ((state: { installStatus: number }) => void),
  getAppUpdateInfo: vi.fn(),
  startFlexibleUpdate: vi.fn(),
  completeFlexibleUpdate: vi.fn(),
}));
vi.mock("@capawesome/capacitor-app-update", () => ({
  AppUpdateAvailability: { UPDATE_AVAILABLE: 2, UPDATE_NOT_AVAILABLE: 1 },
  FlexibleUpdateInstallStatus: {
    PENDING: 1,
    DOWNLOADING: 2,
    FAILED: 5,
    CANCELED: 6,
    DOWNLOADED: 11,
  },
  AppUpdate: {
    getAppUpdateInfo: update.getAppUpdateInfo,
    startFlexibleUpdate: update.startFlexibleUpdate,
    completeFlexibleUpdate: update.completeFlexibleUpdate,
    addListener: vi.fn(
      (
        _event: string,
        callback: (state: { installStatus: number }) => void,
      ) => {
        update.stateListener = callback;
        return Promise.resolve({ remove: vi.fn() });
      },
    ),
  },
}));

const available = {
  updateAvailability: 2,
  flexibleUpdateAllowed: true,
  installStatus: 0,
};

describe("NativeUpdatePrompt", () => {
  beforeEach(() => {
    native.value = true;
    update.stateListener = undefined;
    update.getAppUpdateInfo.mockReset().mockResolvedValue(available);
    update.startFlexibleUpdate.mockReset().mockResolvedValue({ code: 0 });
    update.completeFlexibleUpdate.mockReset().mockResolvedValue(undefined);
  });
  afterEach(cleanup);

  it("does nothing in a browser", () => {
    native.value = false;
    render(<NativeUpdatePrompt />);

    expect(update.getAppUpdateInfo).not.toHaveBeenCalled();
    expect(screen.queryByText(/new version/i)).toBeNull();
  });

  it("offers the update, downloads it, then asks to restart", async () => {
    const user = userEvent.setup();
    render(<NativeUpdatePrompt />);

    await user.click(await screen.findByRole("button", { name: "Update" }));
    expect(update.startFlexibleUpdate).toHaveBeenCalled();
    expect(screen.getByText(/Downloading the update/)).toBeTruthy();

    await waitFor(() => expect(update.stateListener).toBeDefined());
    act(() => update.stateListener?.({ installStatus: 11 }));
    await user.click(await screen.findByRole("button", { name: "Restart" }));
    expect(update.completeFlexibleUpdate).toHaveBeenCalled();
  });

  it("closes on Later", async () => {
    const user = userEvent.setup();
    render(<NativeUpdatePrompt />);

    await user.click(await screen.findByRole("button", { name: "Later" }));

    await waitFor(() => expect(screen.queryByText(/new version/i)).toBeNull());
    expect(update.startFlexibleUpdate).not.toHaveBeenCalled();
  });

  it("shows nothing when no update is available or the app is not from the Store", async () => {
    update.getAppUpdateInfo.mockResolvedValue({
      updateAvailability: 1,
      installStatus: 0,
    });
    render(<NativeUpdatePrompt />);
    await waitFor(() => expect(update.getAppUpdateInfo).toHaveBeenCalled());
    expect(screen.queryByText(/new version/i)).toBeNull();

    cleanup();
    update.getAppUpdateInfo.mockRejectedValue(
      new Error("not from the Play Store"),
    );
    render(<NativeUpdatePrompt />);
    await waitFor(() =>
      expect(update.getAppUpdateInfo).toHaveBeenCalledTimes(2),
    );
    expect(screen.queryByText(/new version/i)).toBeNull();
  });

  it("offers the restart when an update was already downloaded", async () => {
    update.getAppUpdateInfo.mockResolvedValue({
      updateAvailability: 2,
      installStatus: 11,
    });
    render(<NativeUpdatePrompt />);

    expect(await screen.findByRole("button", { name: "Restart" })).toBeTruthy();
  });
});
