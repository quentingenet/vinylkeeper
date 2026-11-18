import { BarcodeFormat, BarcodeScanner } from "@capacitor-mlkit/barcode-scanning";
import { getPlatform } from "@utils/CapacitorUtils";
import i18n from "@utils/i18n";

// The barcodes printed on records
const RECORD_FORMATS = [BarcodeFormat.Ean13, BarcodeFormat.Ean8, BarcodeFormat.UpcA, BarcodeFormat.UpcE];

export class ScannerNotReadyError extends Error {}

/**
 * Opens the scanner and returns the digits read, or null when the person closes it.
 * Android: Google's scanner, a Google Play services module that downloads once; until then a ScannerNotReadyError
 * is thrown. iOS: the scanner of ML Kit, which needs the camera; a refused camera throws a translated message.
 */
export async function scanRecordBarcode(): Promise<string | null> {
  if (getPlatform() === "ios") {
    // Asked once by iOS (with NSCameraUsageDescription); refused, the scanner would only give an English error
    const { camera } = await BarcodeScanner.requestPermissions();
    if (camera !== "granted" && camera !== "limited") throw new Error(i18n.t("common:scanner.cameraDenied"));
  } else {
    const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
    if (!available) {
      await BarcodeScanner.installGoogleBarcodeScannerModule();
      throw new ScannerNotReadyError(i18n.t("common:scanner.installing"));
    }
  }
  try {
    const { barcodes } = await BarcodeScanner.scan({ formats: RECORD_FORMATS });
    return barcodes[0]?.rawValue ?? null;
  } catch (error) {
    if (error instanceof Error && /cancel/i.test(error.message)) return null;
    throw error;
  }
}
