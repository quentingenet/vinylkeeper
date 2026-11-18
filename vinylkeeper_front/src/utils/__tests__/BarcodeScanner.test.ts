import { describe, it, expect, vi, beforeEach } from "vitest";
import { scanRecordBarcode, ScannerNotReadyError } from "@utils/BarcodeScanner";

const platform = vi.hoisted(() => ({ value: "android" as "android" | "ios" }));
const scanner = vi.hoisted(() => ({
  isGoogleBarcodeScannerModuleAvailable: vi.fn(),
  installGoogleBarcodeScannerModule: vi.fn(),
  requestPermissions: vi.fn(),
  scan: vi.fn(),
}));
vi.mock("@utils/CapacitorUtils", () => ({ getPlatform: () => platform.value }));
vi.mock("@capacitor-mlkit/barcode-scanning", () => ({
  BarcodeScanner: scanner,
  BarcodeFormat: { Ean13: "EAN_13", Ean8: "EAN_8", UpcA: "UPC_A", UpcE: "UPC_E" },
}));

beforeEach(() => {
  vi.clearAllMocks();
  platform.value = "android";
  scanner.scan.mockResolvedValue({ barcodes: [{ rawValue: "5099902987927" }] });
});

describe("scanRecordBarcode", () => {
  it("Android: Google's scanner, once its module is there", async () => {
    scanner.isGoogleBarcodeScannerModuleAvailable.mockResolvedValue({ available: true });

    expect(await scanRecordBarcode()).toBe("5099902987927");
    expect(scanner.requestPermissions).not.toHaveBeenCalled();
  });

  it("Android: the module downloads first", async () => {
    scanner.isGoogleBarcodeScannerModuleAvailable.mockResolvedValue({ available: false });

    await expect(scanRecordBarcode()).rejects.toBeInstanceOf(ScannerNotReadyError);
    expect(scanner.installGoogleBarcodeScannerModule).toHaveBeenCalled();
    expect(scanner.scan).not.toHaveBeenCalled();
  });

  it("iOS: no Google module (iOS would refuse the call), the camera is asked for instead", async () => {
    platform.value = "ios";
    scanner.requestPermissions.mockResolvedValue({ camera: "granted" });

    expect(await scanRecordBarcode()).toBe("5099902987927");
    expect(scanner.isGoogleBarcodeScannerModuleAvailable).not.toHaveBeenCalled();
  });

  it("iOS: a refused camera says where to allow it, in the language of the app", async () => {
    platform.value = "ios";
    scanner.requestPermissions.mockResolvedValue({ camera: "denied" });

    await expect(scanRecordBarcode()).rejects.toThrow("Allow Vinyl Keeper to use the camera in the Settings");
    expect(scanner.scan).not.toHaveBeenCalled();
  });

  it("closing the scanner is not an error", async () => {
    scanner.isGoogleBarcodeScannerModuleAvailable.mockResolvedValue({ available: true });
    scanner.scan.mockRejectedValue(new Error("scan canceled."));

    expect(await scanRecordBarcode()).toBeNull();
  });
});
