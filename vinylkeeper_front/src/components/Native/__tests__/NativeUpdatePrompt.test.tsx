import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NativeUpdatePrompt from "@components/Native/NativeUpdatePrompt";

const native = vi.hoisted(() => ({ value: true }));
vi.mock("@utils/CapacitorUtils", () => ({
  isCapacitorPlatform: () => native.value,
}));
vi.mock("@utils/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn() } }));
const app = vi.hoisted(() => ({
  resume: undefined as undefined | (() => void),
}));
vi.mock("@capacitor/app", () => ({
  App: {
    addListener: vi.fn((_event: string, callback: () => void) => {
      app.resume = callback;
      return Promise.resolve({ remove: vi.fn() });
    }),
  },
}));

type FlexibleState = {
  installStatus: number;
  bytesDownloaded?: number;
  totalBytesToDownload?: number;
};

const update = vi.hoisted(() => ({
  stateListener: undefined as
    undefined | ((state: FlexibleState) => void),
  getAppUpdateInfo: vi.fn(),
  startFlexibleUpdate: vi.fn(),
  completeFlexibleUpdate: vi.fn(),
}));
vi.mock("@capawesome/capacitor-app-update", () => ({
  AppUpdateAvailability: {
    UPDATE_NOT_AVAILABLE: 1,
    UPDATE_AVAILABLE: 2,
    UPDATE_IN_PROGRESS: 3,
  },
  AppUpdateResultCode: { OK: 0, CANCELED: 1 },
  FlexibleUpdateInstallStatus: {
    PENDING: 1,
    DOWNLOADING: 2,
    INSTALLING: 3,
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
        callback: (state: FlexibleState) => void,
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
    app.resume = undefined;
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
    expect(screen.getByText(/Update in progress/)).toBeTruthy();

    await waitFor(() => expect(update.stateListener).toBeDefined());
    act(() =>
      update.stateListener?.({
        installStatus: 2,
        bytesDownloaded: 42,
        totalBytesToDownload: 100,
      }),
    );
    expect(screen.getByText(/Update in progress \(42%\)/)).toBeTruthy();

    act(() => update.stateListener?.({ installStatus: 11 }));
    await user.click(await screen.findByRole("button", { name: "Restart" }));
    expect(update.completeFlexibleUpdate).toHaveBeenCalled();
    expect(screen.getByText(/Installing the update/)).toBeTruthy();
  });

  it("keeps the progress when the app comes back from the Google Play dialog", async () => {
    const user = userEvent.setup();
    render(<NativeUpdatePrompt />);
    await user.click(await screen.findByRole("button", { name: "Update" }));

    // Google Play has not reported the download yet: the update still looks available
    await waitFor(() => expect(app.resume).toBeDefined());
    act(() => app.resume?.());
    await waitFor(() =>
      expect(update.getAppUpdateInfo).toHaveBeenCalledTimes(2),
    );

    expect(screen.queryByRole("button", { name: "Update" })).toBeNull();
    expect(screen.getByText(/Update in progress/)).toBeTruthy();
  });

  it("closes when the update is refused in the Google Play dialog", async () => {
    update.startFlexibleUpdate.mockResolvedValue({ code: 1 });
    const user = userEvent.setup();
    render(<NativeUpdatePrompt />);

    await user.click(await screen.findByRole("button", { name: "Update" }));

    await waitFor(() =>
      expect(screen.queryByText(/Update in progress/)).toBeNull(),
    );
    act(() => app.resume?.());
    await waitFor(() =>
      expect(update.getAppUpdateInfo).toHaveBeenCalledTimes(2),
    );
    expect(screen.queryByRole("button", { name: "Update" })).toBeNull();
  });

  it("shows the progress when an update is already downloading at launch", async () => {
    update.getAppUpdateInfo.mockResolvedValue({
      updateAvailability: 3,
      installStatus: 0,
    });
    render(<NativeUpdatePrompt />);

    expect(await screen.findByText(/Update in progress/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Update" })).toBeNull();
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
