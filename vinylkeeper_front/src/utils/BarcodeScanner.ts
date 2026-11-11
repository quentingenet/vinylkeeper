import { BarcodeFormat, BarcodeScanner } from "@capacitor-mlkit/barcode-scanning";

// The barcodes printed on records
const RECORD_FORMATS = [BarcodeFormat.Ean13, BarcodeFormat.Ean8, BarcodeFormat.UpcA, BarcodeFormat.UpcE];

export class ScannerNotReadyError extends Error {}

/**
 * Opens Google's scanner and returns the digits read, or null when the person closes it.
 * The scanner is a Google Play services module that downloads once: until then a ScannerNotReadyError is thrown.
 */
export async function scanRecordBarcode(): Promise<string | null> {
  const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
  if (!available) {
    await BarcodeScanner.installGoogleBarcodeScannerModule();
    throw new ScannerNotReadyError("The scanner is being installed, try again in a moment.");
  }
  try {
    const { barcodes } = await BarcodeScanner.scan({ formats: RECORD_FORMATS });
    return barcodes[0]?.rawValue ?? null;
  } catch (error) {
    if (error instanceof Error && /cancel/i.test(error.message)) return null;
    throw error;
  }
}
